import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { orbitUsers, tasks } from "../../../db/schema";
import type { Task } from "../../components/task-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TaskRow = typeof tasks.$inferSelect;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isDateString(value: string) {
  return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimestamp(value: string) {
  return Number.isFinite(Date.parse(value));
}

function parseTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Task>;
  const completedAt = candidate.completedAt;

  if (
    typeof candidate.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(candidate.id) ||
    typeof candidate.title !== "string" ||
    candidate.title.trim().length < 1 ||
    candidate.title.trim().length > 120 ||
    typeof candidate.description !== "string" ||
    candidate.description.length > 500 ||
    typeof candidate.dueDate !== "string" ||
    !isDateString(candidate.dueDate) ||
    !["high", "medium", "low"].includes(candidate.priority ?? "") ||
    typeof candidate.completed !== "boolean" ||
    typeof candidate.createdAt !== "string" ||
    !isTimestamp(candidate.createdAt) ||
    (completedAt !== undefined &&
      (typeof completedAt !== "string" || !isTimestamp(completedAt)))
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title.trim(),
    description: candidate.description.trim(),
    dueDate: candidate.dueDate,
    priority: candidate.priority as Task["priority"],
    completed: candidate.completed,
    createdAt: candidate.createdAt,
    ...(completedAt ? { completedAt } : {}),
  };
}

function toRow(userId: string, task: Task): typeof tasks.$inferInsert {
  return {
    userId,
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    completed: task.completed,
    createdAt: task.createdAt,
    completedAt: task.completedAt ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    priority: row.priority as Task["priority"],
    completed: row.completed,
    createdAt: row.createdAt,
    ...(row.completedAt ? { completedAt: row.completedAt } : {}),
  };
}

async function requireUserId() {
  const { userId } = await auth();
  return userId;
}

async function ensureProfile(userId: string) {
  const db = getDb();
  await db.insert(orbitUsers).values({ userId }).onConflictDoNothing();
  return db;
}

async function loadUserTasks(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.createdAt));
}

function taskUpdate(task: Task) {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    completed: task.completed,
    createdAt: task.createdAt,
    completedAt: task.completedAt ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const db = await ensureProfile(userId);
    const [profile, rows] = await Promise.all([
      db
        .select({ initializedAt: orbitUsers.initializedAt })
        .from(orbitUsers)
        .where(eq(orbitUsers.userId, userId))
        .limit(1),
      loadUserTasks(userId),
    ]);

    return Response.json({
      tasks: rows.map(toTask),
      needsMigration: !profile[0]?.initializedAt,
    });
  } catch (error) {
    console.error("Unable to load tasks", error);
    return jsonError("Cloud storage is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await request.json()) as { task?: unknown; tasks?: unknown; initialize?: unknown };
    const db = await ensureProfile(userId);

    if (Array.isArray(body.tasks) && body.initialize === true) {
      if (body.tasks.length > 250) return jsonError("Too many tasks to import.", 400);
      const imported = body.tasks.map(parseTask);
      if (imported.some((task) => !task)) return jsonError("Invalid task data.", 400);

      const validTasks = imported as Task[];
      if (validTasks.length > 0) {
        await db
          .insert(tasks)
          .values(validTasks.map((task) => toRow(userId, task)))
          .onConflictDoUpdate({
            target: [tasks.userId, tasks.id],
            set: {
              title: sql`excluded.title`,
              description: sql`excluded.description`,
              dueDate: sql`excluded.due_date`,
              priority: sql`excluded.priority`,
              completed: sql`excluded.completed`,
              createdAt: sql`excluded.created_at`,
              completedAt: sql`excluded.completed_at`,
              updatedAt: sql`excluded.updated_at`,
            },
          });
      }

      await db
        .update(orbitUsers)
        .set({ initializedAt: new Date().toISOString() })
        .where(eq(orbitUsers.userId, userId));

      const rows = await loadUserTasks(userId);
      return Response.json({ tasks: rows.map(toTask) });
    }

    const task = parseTask(body.task);
    if (!task) return jsonError("Invalid task data.", 400);

    const [row] = await db
      .insert(tasks)
      .values(toRow(userId, task))
      .onConflictDoUpdate({
        target: [tasks.userId, tasks.id],
        set: taskUpdate(task),
      })
      .returning();

    return Response.json({ task: toTask(row) }, { status: 201 });
  } catch (error) {
    console.error("Unable to create tasks", error);
    return jsonError("Task could not be saved.", 500);
  }
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await request.json()) as { task?: unknown };
    const task = parseTask(body.task);
    if (!task) return jsonError("Invalid task data.", 400);

    const db = getDb();
    const [row] = await db
      .update(tasks)
      .set(taskUpdate(task))
      .where(and(eq(tasks.userId, userId), eq(tasks.id, task.id)))
      .returning();

    if (!row) return jsonError("Task not found.", 404);
    return Response.json({ task: toTask(row) });
  } catch (error) {
    console.error("Unable to update task", error);
    return jsonError("Task could not be updated.", 500);
  }
}

export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) return jsonError("Invalid task id.", 400);

  try {
    const db = getDb();
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .returning({ id: tasks.id });

    if (!deleted) return jsonError("Task not found.", 404);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to delete task", error);
    return jsonError("Task could not be deleted.", 500);
  }
}
