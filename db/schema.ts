import { boolean, index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const orbitUsers = pgTable("orbit_users", {
  userId: text("user_id").primaryKey(),
  initializedAt: timestamp("initialized_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export const tasks = pgTable(
  "tasks",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    dueDate: text("due_date").default("").notNull(),
    priority: text("priority").notNull(),
    completed: boolean("completed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("tasks_user_created_idx").on(table.userId, table.createdAt),
  ],
);
