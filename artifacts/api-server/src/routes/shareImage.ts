import { Router } from "express";
import { getAuth } from "@clerk/express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { badgeShareImagesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  objectStorageClient,
} from "../lib/objectStorage";
import { logger } from "../lib/logger";
import {
  deleteBadgeShareObject,
  getBadgeShareStorageTarget,
} from "../services/badgeShareCleanup";
import {
  AccountDeletionInProgressError,
  isAccountDeletionStarted,
  withAccountWriteLock,
} from "../services/accountDeletionGuard";

const router = Router();

/**
 * Badge share images are produced by gpt-image-2, which takes 20-60s. The
 * request that starts a generation returns immediately with a "pending"
 * record; the image is generated in the background and written to object
 * storage. The client polls the status endpoint, so it can leave the app and
 * come back at any point without losing the result.
 */

const FEATURED_BREEDS = 10;
const objectStorage = new ObjectStorageService();

function buildPrompt(breedNames: string[], totalCollected: number) {
  const breedList = breedNames.map((name) => `- ${name}`).join("\n");
  return `Create a vertical 3:4 collectible achievement badge for a mobile game called "DoggoDex".

ART STYLE:
Classic handcrafted pixel art inspired by cozy 16-bit/32-bit farming and adventure games.
Use crisp pixel edges, visible pixel clusters, limited color palette, charming pixel shading, and detailed sprite-style characters.

IMPORTANT:
This must look like TRUE PIXEL ART, NOT realistic, NOT photorealistic, NOT 3D, NOT a digital painting, and NOT smooth vector art.

DOGS:
Feature these dog breeds prominently:
${breedList}

Draw each dog as a charming, recognizable pixel-art sprite. Keep their distinctive breed characteristics such as fur color, ears, body shape, and markings.

COMPOSITION:
- Vertical 3:4 composition
- All dogs gathered together like a collectible achievement scene
- Cozy colorful outdoor pixel-art environment
- Small decorative flowers, grass, sparkles, paw prints, etc.
- Playful adventure-game atmosphere
- Rich pixel-art details
- Clear focal point around the dogs
- Leave clean space for text

BADGE TEXT:
"DOGGODEX"
"${totalCollected} DOGGOS COLLECTED"

Typography should also be pixel-art inspired and highly readable.

OVERALL FEEL:
A rare collectible achievement screen from a cozy pixel-art adventure game.
Cute, nostalgic, playful, collectible, handcrafted.

Do NOT use:
photorealism, realistic fur, realistic lighting, 3D rendering, CGI, glossy mobile-game graphics, smooth gradients, anime, or realistic photography.

Do not include Pokémon characters, logos, Poké Balls, or copyrighted Pokémon assets.
Do not add any extra text. Make all requested text highly legible.`;
}

async function uploadPng(
  buffer: Buffer,
  clerkId: string,
  badgeId: string,
): Promise<string> {
  const { bucketName, objectName, objectPath } =
    getBadgeShareStorageTarget(clerkId, badgeId);

  await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .save(buffer, { contentType: "image/png" });

  return objectPath;
}

/**
 * Runs the slow generation after the HTTP response has already been sent.
 * Every exit path writes a terminal status so the client never polls forever.
 */
async function generateInBackground(
  clerkId: string,
  badgeId: string,
  breedNames: string[],
  totalCollected: number,
  previousObjectPath: string | null,
) {
  const finish = async (fields: { status: string; objectPath?: string | null; error?: string | null }) => {
    try {
      return await withAccountWriteLock(clerkId, (tx) =>
        tx
          .update(badgeShareImagesTable)
          .set({ ...fields, updatedAt: new Date() })
          .where(
            and(
              eq(badgeShareImagesTable.clerkId, clerkId),
              eq(badgeShareImagesTable.badgeId, badgeId),
            ),
          )
          .returning({ badgeId: badgeShareImagesTable.badgeId }),
      );
    } catch (err) {
      if (err instanceof AccountDeletionInProgressError) return [];
      throw err;
    }
  };

  let uploadedObjectPath: string | null = null;

  try {
    if (await isAccountDeletionStarted(clerkId)) return;

    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      ? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      : undefined;
    if (!apiKey) throw new Error("No OpenAI credentials configured");

    const openai = new OpenAI({ apiKey, baseURL, timeout: 240_000 });
    const started = Date.now();
    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: buildPrompt(breedNames, totalCollected),
      size: "1024x1536",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image data");
    if (await isAccountDeletionStarted(clerkId)) return;

    const objectPath = await uploadPng(
      Buffer.from(b64, "base64"),
      clerkId,
      badgeId,
    );
    uploadedObjectPath = objectPath;

    if (await isAccountDeletionStarted(clerkId)) {
      await deleteBadgeShareObject(objectPath);
      uploadedObjectPath = null;
      return;
    }

    if (previousObjectPath && previousObjectPath !== objectPath) {
      await deleteBadgeShareObject(previousObjectPath);
    }

    const updated = await finish({ status: "ready", objectPath, error: null });
    if (updated.length === 0) {
      await deleteBadgeShareObject(objectPath);
      uploadedObjectPath = null;
      return;
    }

    uploadedObjectPath = null;
    logger.info({ clerkId, badgeId, ms: Date.now() - started }, "Badge share image ready");
  } catch (err) {
    logger.error({ err, clerkId, badgeId }, "Badge share image generation failed");
    if (uploadedObjectPath) {
      try {
        await deleteBadgeShareObject(uploadedObjectPath);
      } catch (deleteErr) {
        logger.error(
          { err: deleteErr, clerkId, badgeId },
          "Failed to remove incomplete badge image",
        );
      }
    }
    if (await isAccountDeletionStarted(clerkId)) return;
    try {
      await finish({
        status: "failed",
        error: err instanceof Error ? err.message.slice(0, 500) : "unknown error",
      });
    } catch (dbErr) {
      logger.error({ err: dbErr, clerkId, badgeId }, "Failed to record generation failure");
    }
  }
}

/**
 * POST /badge-image
 * Starts (or resumes) generation for a badge. Responds immediately.
 */
router.post("/badge-image", async (req, res) => {
  const clerkId = getAuth(req)?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  const { badgeId, breeds, totalCollected, regenerate } = req.body as {
    badgeId?: unknown;
    breeds?: unknown;
    totalCollected?: unknown;
    regenerate?: unknown;
  };

  const breedNames = Array.isArray(breeds)
    ? breeds
        .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
        .slice(0, FEATURED_BREEDS)
    : [];

  if (
    typeof badgeId !== "string" ||
    !badgeId.trim() ||
    breedNames.length === 0 ||
    !Number.isInteger(totalCollected) ||
    (totalCollected as number) < breedNames.length
  ) {
    return res.status(400).json({
      error: "bad_request",
      message:
        "badgeId, breeds and a totalCollected count greater than or equal to the breed list length are required.",
    });
  }

  try {
    const preparation = await withAccountWriteLock(
      clerkId,
      async (tx): Promise<{
        status: "pending" | "ready";
        objectPath: string | null;
        shouldGenerate: boolean;
        previousObjectPath: string | null;
      }> => {
        const existing = await tx
          .select()
          .from(badgeShareImagesTable)
          .where(
            and(
              eq(badgeShareImagesTable.clerkId, clerkId),
              eq(badgeShareImagesTable.badgeId, badgeId),
            ),
          )
          .limit(1);

        const current = existing[0];

        // A generation already running: never start a second one for the same badge.
        if (current?.status === "pending" && !regenerate) {
          return {
            status: "pending",
            objectPath: null,
            shouldGenerate: false,
            previousObjectPath: current.objectPath,
          };
        }
        // Already produced: hand back the finished image.
        if (current?.status === "ready" && current.objectPath && !regenerate) {
          return {
            status: "ready",
            objectPath: current.objectPath,
            shouldGenerate: false,
            previousObjectPath: current.objectPath,
          };
        }

        if (current) {
          await tx
            .update(badgeShareImagesTable)
            .set({ status: "pending", error: null, updatedAt: new Date() })
            .where(
              and(
                eq(badgeShareImagesTable.clerkId, clerkId),
                eq(badgeShareImagesTable.badgeId, badgeId),
              ),
            );
        } else {
          await tx
            .insert(badgeShareImagesTable)
            .values({ clerkId, badgeId, status: "pending" });
        }

        return {
          status: "pending",
          objectPath: null,
          shouldGenerate: true,
          previousObjectPath: current?.objectPath ?? null,
        };
      },
    );

    if (preparation.shouldGenerate) {
      // Fire-and-forget: the response goes out now, the image lands later.
      void generateInBackground(
        clerkId,
        badgeId,
        breedNames,
        totalCollected as number,
        preparation.previousObjectPath,
      );
    }

    return res.json({
      status: preparation.status,
      objectPath: preparation.objectPath,
    });
  } catch (err) {
    if (err instanceof AccountDeletionInProgressError) {
      return res.status(409).json({
        error: "account_deletion_in_progress",
        message: "Account deletion is in progress.",
      });
    }

    req.log?.error({ err }, "Failed to start badge image generation");
    return res.status(500).json({
      error: "db_error",
      message: "Could not start image generation. Please try again.",
    });
  }
});

/**
 * GET /badge-image/{badgeId}
 * Current state of this user's badge image: pending, ready, failed, or none.
 */
router.get("/badge-image/:badgeId", async (req, res) => {
  const clerkId = getAuth(req)?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  try {
    const rows = await db
      .select()
      .from(badgeShareImagesTable)
      .where(
        and(
          eq(badgeShareImagesTable.clerkId, clerkId),
          eq(badgeShareImagesTable.badgeId, req.params.badgeId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return res.json({ status: "none", objectPath: null });
    }
    return res.json({
      status: rows[0].status,
      objectPath: rows[0].objectPath ?? null,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to read badge image status");
    return res.status(500).json({ error: "db_error", message: "Could not read image status." });
  }
});

/**
 * GET /badge-image/{badgeId}/file
 * Streams the finished PNG. Scoped to the owner's own record, so one account
 * can never fetch another account's generated image.
 */
router.get("/badge-image/:badgeId/file", async (req, res) => {
  const clerkId = getAuth(req)?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  try {
    const rows = await db
      .select()
      .from(badgeShareImagesTable)
      .where(
        and(
          eq(badgeShareImagesTable.clerkId, clerkId),
          eq(badgeShareImagesTable.badgeId, req.params.badgeId),
        ),
      )
      .limit(1);

    const objectPath = rows[0]?.objectPath;
    if (!objectPath || rows[0].status !== "ready") {
      return res.status(404).json({ error: "not_found", message: "Image is not ready yet." });
    }

    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", (metadata.contentType as string) ?? "image/png");
    if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
    res.setHeader("Cache-Control", "private, max-age=3600");

    file
      .createReadStream()
      .on("error", (err: unknown) => {
        req.log?.error({ err }, "Badge image stream failed");
        if (!res.headersSent) res.status(500).end();
        else res.end();
      })
      .pipe(res);
    return;
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "not_found", message: "Image is no longer available." });
    }
    req.log?.error({ err }, "Failed to serve badge image");
    return res.status(500).json({ error: "server_error", message: "Could not load the image." });
  }
});

export default router;
