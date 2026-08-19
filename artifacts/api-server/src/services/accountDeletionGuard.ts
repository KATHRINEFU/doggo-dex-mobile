import { createHash } from "node:crypto";
import {
  badgeShareImagesTable,
  db,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const TOMBSTONE_BADGE_ID = "__account_deleted__";

export class AccountDeletionInProgressError extends Error {
  constructor() {
    super("Account deletion is in progress");
    this.name = "AccountDeletionInProgressError";
    Object.setPrototypeOf(this, AccountDeletionInProgressError.prototype);
  }
}

export function getClerkIdHash(clerkId: string): string {
  return createHash("sha256").update(clerkId).digest("hex");
}

function getTombstoneOwnerId(clerkId: string): string {
  return `deleted:${getClerkIdHash(clerkId)}`;
}

async function lockAccount(
  tx: DbTransaction,
  clerkIdHash: string,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${clerkIdHash}, 0))`,
  );
}

export async function beginAccountDeletion(clerkId: string): Promise<void> {
  const clerkIdHash = getClerkIdHash(clerkId);
  const tombstoneOwnerId = getTombstoneOwnerId(clerkId);

  await db.transaction(async (tx) => {
    await lockAccount(tx, clerkIdHash);
    await tx
      .insert(badgeShareImagesTable)
      .values({
        clerkId: tombstoneOwnerId,
        badgeId: TOMBSTONE_BADGE_ID,
        status: "deleted",
      })
      .onConflictDoNothing();
  });
}

export async function isAccountDeletionStarted(
  clerkId: string,
): Promise<boolean> {
  const rows = await db
    .select({ badgeId: badgeShareImagesTable.badgeId })
    .from(badgeShareImagesTable)
    .where(
      and(
        eq(badgeShareImagesTable.clerkId, getTombstoneOwnerId(clerkId)),
        eq(badgeShareImagesTable.badgeId, TOMBSTONE_BADGE_ID),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Serializes every per-user write against account deletion and checks the
 * durable suppression record while the same transaction-level lock is held.
 */
export async function withAccountWriteLock<T>(
  clerkId: string,
  action: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const clerkIdHash = getClerkIdHash(clerkId);

  return db.transaction(async (tx) => {
    await lockAccount(tx, clerkIdHash);

    const tombstones = await tx
      .select({ badgeId: badgeShareImagesTable.badgeId })
      .from(badgeShareImagesTable)
      .where(
        and(
          eq(badgeShareImagesTable.clerkId, getTombstoneOwnerId(clerkId)),
          eq(badgeShareImagesTable.badgeId, TOMBSTONE_BADGE_ID),
        ),
      )
      .limit(1);

    if (tombstones.length > 0) {
      throw new AccountDeletionInProgressError();
    }

    return action(tx);
  });
}