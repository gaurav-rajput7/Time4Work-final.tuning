import { bigint, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type Time4WorkState = Record<string, unknown>;

export const time4workUserState = pgTable("time4work_user_state", {
  userId: text("user_id").primaryKey(),
  payload: jsonb("payload").$type<Time4WorkState>().notNull(),
  revision: bigint("revision", { mode: "number" }).notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
