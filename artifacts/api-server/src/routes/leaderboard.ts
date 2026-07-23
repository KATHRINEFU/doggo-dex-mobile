import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";

const router = Router();

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /users/sync
 * Creates or updates the user's profile after sign-up.
 * Called from mobile after the user picks a country.
 */
router.post("/users/sync", async (req, res) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  const body = req.body as {
    username?: string;
    displayName?: string;
    country?: string;
    countryFlag?: string;
    avatarUrl?: string;
  };

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 100) : undefined;
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const countryFlag = typeof body.countryFlag === "string" ? body.countryFlag.trim() : "";
  const avatarUrl = typeof body.avatarUrl === "string" && isValidUrl(body.avatarUrl) ? body.avatarUrl : undefined;

  if (!username || username.length > 50 || !country || country.length > 100) {
    return res.status(400).json({ error: "bad_request", message: "Invalid username or country" });
  }

  try {
    // Check username uniqueness (globally) — case-insensitive
    const normalized = username.toLowerCase();
    const nameTaken = await db
      .select()
      .from(usersTable)
      .where(
        and(
          sql`LOWER(${usersTable.username}) = ${normalized}`,
          sql`${usersTable.clerkId} != ${clerkId}`,
        ),
      )
      .limit(1);
    if (nameTaken.length > 0) {
      return res.status(409).json({
        error: "username_taken",
        message: `The username "${username}" is already taken. Please pick another one.`,
      });
    }

    // Upsert: insert if new, update if exists
    const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);

    if (existing.length > 0) {
      await db
        .update(usersTable)
        .set({
          username,
          displayName: displayName ?? existing[0].displayName,
          country,
          countryFlag,
          avatarUrl: avatarUrl ?? existing[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.clerkId, clerkId));
    } else {
      await db.insert(usersTable).values({
        clerkId,
        username,
        displayName: displayName ?? null,
        country,
        countryFlag,
        avatarUrl: avatarUrl ?? null,
      });
    }

    req.log?.info({ clerkId, country }, "User synced");
    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "User sync failed");
    return res.status(500).json({ error: "db_error", message: "Failed to save user" });
  }
});

/**
 * PATCH /users/display-name
 * Updates only the display name for the authenticated user.
 */
router.patch("/users/display-name", async (req, res) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  const displayName = typeof req.body?.displayName === "string"
    ? req.body.displayName.trim().slice(0, 100)
    : null;

  try {
    await db
      .update(usersTable)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(usersTable.clerkId, clerkId));

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Display name update failed");
    return res.status(500).json({ error: "db_error", message: "Failed to update display name" });
  }
});

/**
 * POST /users/collect
 * Increments a user's collection count and XP after they scan a new breed.
 */
router.post("/users/collect", async (req, res) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  let xpDelta = 10;
  if (req.body && typeof req.body.xpDelta === "number") {
    xpDelta = Math.max(0, Math.min(1000, req.body.xpDelta));
  }

  try {
    await db
      .update(usersTable)
      .set({
        collectionCount: sql`${usersTable.collectionCount} + 1`,
        xp: sql`${usersTable.xp} + ${xpDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkId, clerkId));

    req.log?.info({ clerkId, xpDelta }, "Collection recorded");
    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Collection update failed");
    return res.status(500).json({ error: "db_error", message: "Failed to update stats" });
  }
});

/**
 * GET /leaderboard
 * Returns ranked users. Query params:
 *   - country: filter to a specific country (optional)
 *   - limit: max results (default 50, max 100)
 */
router.get("/leaderboard", async (req, res) => {
  const countryQuery = typeof req.query.country === "string" ? req.query.country.trim() : undefined;
  let limit = 50;
  if (req.query.limit) {
    const parsedLimit = Number(req.query.limit);
    if (!Number.isNaN(parsedLimit)) {
      limit = Math.max(1, Math.min(100, parsedLimit));
    }
  }

  const country = countryQuery && countryQuery.length >= 2 && countryQuery.length <= 100 ? countryQuery : undefined;

  try {
    const condition = country ? and(eq(usersTable.country, country), sql`${usersTable.collectionCount} > 0`) : sql`${usersTable.collectionCount} > 0`;

    const rows = await db
      .select()
      .from(usersTable)
      .where(condition)
      .orderBy(desc(usersTable.collectionCount), desc(usersTable.xp))
      .limit(limit);

    // Compute rank for each row
    const ranked = rows.map((user, index) => ({
      rank: index + 1,
      clerkId: user.clerkId,
      username: user.username,
      displayName: user.displayName ?? null,
      country: user.country,
      countryFlag: user.countryFlag,
      collectionCount: user.collectionCount,
      xp: user.xp,
      avatarUrl: user.avatarUrl,
    }));

    return res.json(ranked);
  } catch (err) {
    req.log?.error({ err }, "Leaderboard query failed");
    return res.status(500).json({ error: "db_error", message: "Failed to load leaderboard" });
  }
});

export default router;
