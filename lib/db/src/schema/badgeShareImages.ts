import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One AI-generated share image per (user, badge).
 *
 * Generation takes tens of seconds, so the record — not the client — owns the
 * lifecycle. The app can be closed and reopened at any point; the row says
 * whether the image is still being produced, ready to download, or failed.
 */
export const badgeShareImagesTable = pgTable(
  "badge_share_images",
  {
    clerkId: text("clerk_id").notNull(),
    badgeId: text("badge_id").notNull(),
    /** "pending" | "ready" | "failed" */
    status: text("status").notNull().default("pending"),
    /** Object-storage path (/objects/...) once the image is uploaded. */
    objectPath: text("object_path"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.clerkId, table.badgeId] })],
);

export const insertBadgeShareImageSchema = createInsertSchema(
  badgeShareImagesTable,
).omit({ createdAt: true, updatedAt: true });

export type InsertBadgeShareImage = z.infer<typeof insertBadgeShareImageSchema>;
export type BadgeShareImage = typeof badgeShareImagesTable.$inferSelect;
