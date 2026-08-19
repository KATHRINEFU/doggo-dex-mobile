import { db, badgeShareImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  objectStorageClient,
} from "../lib/objectStorage";
import { getClerkIdHash } from "./accountDeletionGuard";

const objectStorage = new ObjectStorageService();

function getPrivateStorageLocation(): {
  bucketName: string;
  privatePrefix: string;
} {
  const privateDir = objectStorage
    .getPrivateObjectDir()
    .replace(/^\/+|\/+$/g, "");
  const [bucketName, ...prefixParts] = privateDir.split("/");
  return {
    bucketName,
    privatePrefix: prefixParts.join("/"),
  };
}

export function getBadgeShareStorageTarget(
  clerkId: string,
  badgeId: string,
): {
  bucketName: string;
  objectName: string;
  objectPath: string;
} {
  const { bucketName, privatePrefix } = getPrivateStorageLocation();
  const userHash = getClerkIdHash(clerkId);
  const badgeHash = getClerkIdHash(badgeId);
  const entityId = `badge-shares/${userHash}/${badgeHash}.png`;
  const objectName = [privatePrefix, entityId].filter(Boolean).join("/");

  return {
    bucketName,
    objectName,
    objectPath: `/objects/${entityId}`,
  };
}

export async function deleteBadgeShareObject(objectPath: string): Promise<void> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    await file.delete({ ignoreNotFound: true });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return;
    throw err;
  }
}

/**
 * Prevents in-flight image generation from leaving a late object behind,
 * removes every stored badge image, then removes the user's job records.
 */
export async function deleteBadgeSharesForUser(clerkId: string): Promise<void> {
  const rows = await db
    .select({ objectPath: badgeShareImagesTable.objectPath })
    .from(badgeShareImagesTable)
    .where(eq(badgeShareImagesTable.clerkId, clerkId));

  const objectPaths = Array.from(
    new Set(
      rows
        .map(({ objectPath }) => objectPath)
        .filter((objectPath): objectPath is string => Boolean(objectPath)),
    ),
  );

  const { bucketName, privatePrefix } = getPrivateStorageLocation();
  const userPrefix = [
    privatePrefix,
    "badge-shares",
    getClerkIdHash(clerkId),
    "",
  ]
    .filter((part, index, parts) => part.length > 0 || index === parts.length - 1)
    .join("/");
  const [userFiles] = await objectStorageClient
    .bucket(bucketName)
    .getFiles({ prefix: userPrefix });

  await Promise.all([
    ...objectPaths.map(deleteBadgeShareObject),
    ...userFiles.map((file) => file.delete({ ignoreNotFound: true })),
  ]);
  await db
    .delete(badgeShareImagesTable)
    .where(eq(badgeShareImagesTable.clerkId, clerkId));
}