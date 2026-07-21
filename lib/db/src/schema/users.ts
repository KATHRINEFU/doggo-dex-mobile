import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  clerkId: text("clerk_id").primaryKey(),
  username: text("username").notNull(),
  country: text("country").notNull(),
  countryFlag: text("country_flag").notNull().default(""),
  collectionCount: integer("collection_count").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
