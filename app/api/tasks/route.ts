import { auth, currentUser } from "@clerk/nextjs/server";
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../../db";
import { orbitUsers, teamMembers, tasks } from "../../../db/schema";
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
  const teamId = candidate.teamId;

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
    (teamId !== undefined &&
      (typeof teamId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(teamId))) ||
    (completedAt !== undefined &&
      (typeof completedAt !== "string" || !isTimestamp(completedAt)))
  ) {
    return null;
  }

  return {
    id: candidate.id,
    ...(teamId ? { teamId } : {}),
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
    teamId: task.teamId ?? null,
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

function toTask(row: TaskRow, createdBy?: string): Task {
  return {
    id: row.id,
    ...(row.teamId ? { teamId: row.teamId } : {}),
    ...(row.teamId ? { createdBy: createdBy ?? "Orbit member" } : {}),
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
  let displayName: string | undefined;

  try {
    const account = await currentUser();
    const email = account?.emailAddresses.find(
      (item) => item.id === account.primaryEmailAddressId,
    )?.emailAddress;
    displayName =
      [account?.firstName, account?.lastName].filter(Boolean).join(" ").trim() ||
      account?.username ||
      email?.split("@")[0] ||
      undefined;
  } catch (error) {
    console.error("Unable to refresh the Orbit display name", error);
  }

  if (displayName) {
    await db
      .insert(orbitUsers)
      .values({ userId, displayName })
      .onConflictDoUpdate({
        target: orbitUsers.userId,
        set: { displayName },
      });
  } else {
    await db.insert(orbitUsers).values({ userId }).onConflictDoNothing();
  }

  const [profile] = await db
    .select({ displayName: orbitUsers.displayName })
    .from(orbitUsers)
    .where(eq(orbitUsers.userId, userId))
    .limit(1);

  return { db, displayName: profile?.displayName ?? "Orbit member" };
}

async function getTeamIds(userId: string) {
  const db = getDb();
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  return memberships.map((membership) => membership.teamId);
}

function accessCondition(userId: string, teamIds: string[]): SQL {
  const personal = and(eq(tasks.userId, userId), isNull(tasks.teamId))!;
  return teamIds.length > 0
    ? or(personal, inArray(tasks.teamId, teamIds))!
    : personal;
}

async function loadAccessibleTasks(userId: string, teamIds: string[]) {
  const db = getDb();
  return db
    .select()
    .from(tasks)
    .where(accessCondition(userId, teamIds))
    .orderBy(asc(tasks.createdAt));
}

async function tasksWithCreators(
  db: ReturnType<typeof getDb>,
  rows: TaskRow[],
) {
  const creatorIds = [
    ...new Set(
      rows.filter((row) => row.teamId).map((row) => row.userId),
    ),
  ];
  if (creatorIds.length === 0) return rows.map((row) => toTask(row));

  const profiles = await db
    .select({ userId: orbitUsers.userId, displayName: orbitUsers.displayName })
    .from(orbitUsers)
    .where(inArray(orbitUsers.userId, creatorIds));
  const names = new Map(
    profiles.map((profile) => [profile.userId, profile.displayName]),
  );

  return rows.map((row) => toTask(row, names.get(row.userId)));
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
    const { db } = await ensureProfile(userId);
    const [profile, teamIds] = await Promise.all([
      db
        .select({ initializedAt: orbitUsers.initializedAt })
        .from(orbitUsers)
        .where(eq(orbitUsers.userId, userId))
        .limit(1),
      getTeamIds(userId),
    ]);
    const rows = await loadAccessibleTasks(userId, teamIds);

    return Response.json({
      tasks: await tasksWithCreators(db, rows),
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
    const { db, displayName } = await ensureProfile(userId);

    if (Array.isArray(body.tasks) && body.initialize === true) {
      if (body.tasks.length > 250) return jsonError("Too many tasks to import.", 400);
      const imported = body.tasks.map(parseTask);
      if (imported.some((task) => !task)) return jsonError("Invalid task data.", 400);

      const validTasks = (imported as Task[]).map((task) => ({
        ...task,
        teamId: undefined,
      }));
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

      const teamIds = await getTeamIds(userId);
      const rows = await loadAccessibleTasks(userId, teamIds);
      return Response.json({ tasks: await tasksWithCreators(db, rows) });
    }

    const task = parseTask(body.task);
    if (!task) return jsonError("Invalid task data.", 400);

    if (task.teamId) {
      const teamIds = await getTeamIds(userId);
      if (!teamIds.includes(task.teamId)) {
        return jsonError("You are not a member of that team.", 403);
      }
    }

    const [row] = await db
      .insert(tasks)
      .values(toRow(userId, task))
      .onConflictDoNothing()
      .returning();

    if (!row) return jsonError("A task with that id already exists.", 409);
    return Response.json(
      { task: toTask(row, task.teamId ? displayName : undefined) },
      { status: 201 },
    );
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
    const teamIds = await getTeamIds(userId);
    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, task.id), accessCondition(userId, teamIds)))
      .limit(1);

    if (!existing) return jsonError("Task not found.", 404);
    const [row] = await db
      .update(tasks)
      .set(taskUpdate(task))
      .where(and(eq(tasks.userId, existing.userId), eq(tasks.id, existing.id)))
      .returning();

    const [updatedTask] = await tasksWithCreators(db, [row]);
    return Response.json({ task: updatedTask });
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
    const teamIds = await getTeamIds(userId);
    const [existing] = await db
      .select({ userId: tasks.userId, id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), accessCondition(userId, teamIds)))
      .limit(1);

    if (!existing) return jsonError("Task not found.", 404);
    await db
      .delete(tasks)
      .where(and(eq(tasks.userId, existing.userId), eq(tasks.id, existing.id)));

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to delete task", error);
    return jsonError("Task could not be deleted.", 500);
  }
}
