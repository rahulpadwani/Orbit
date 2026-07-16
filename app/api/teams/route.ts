import { auth } from "@clerk/nextjs/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { orbitUsers, teamInvites, teamMembers, teams } from "../../../db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
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

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const db = await ensureProfile(userId);
    const memberships = await db
      .select({
        id: teams.id,
        name: teams.name,
        role: teamMembers.role,
        createdAt: teams.createdAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    if (memberships.length === 0) return Response.json({ teams: [] });

    const counts = await db
      .select({ teamId: teamMembers.teamId, memberCount: count() })
      .from(teamMembers)
      .where(inArray(teamMembers.teamId, memberships.map((team) => team.id)))
      .groupBy(teamMembers.teamId);
    const countByTeam = new Map(
      counts.map((item) => [item.teamId, Number(item.memberCount)]),
    );

    return Response.json({
      teams: memberships.map((team) => ({
        ...team,
        role: team.role === "owner" ? "owner" : "member",
        memberCount: countByTeam.get(team.id) ?? 1,
      })),
    });
  } catch (error) {
    console.error("Unable to load teams", error);
    return jsonError("Teams are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await request.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 50) {
      return jsonError("Team names must be between 2 and 50 characters.", 400);
    }

    const db = await ensureProfile(userId);
    const id = crypto.randomUUID();
    const [team] = await db
      .insert(teams)
      .values({ id, name, ownerUserId: userId })
      .returning();

    try {
      await db.insert(teamMembers).values({ teamId: id, userId, role: "owner" });
    } catch (error) {
      await db.delete(teams).where(eq(teams.id, id));
      throw error;
    }

    return Response.json(
      {
        team: {
          id: team.id,
          name: team.name,
          role: "owner",
          memberCount: 1,
          createdAt: team.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create team", error);
    return jsonError("Team could not be created.", 500);
  }
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await request.json()) as { action?: unknown; teamId?: unknown };
    if (body.action !== "invite" || typeof body.teamId !== "string") {
      return jsonError("Invalid team action.", 400);
    }

    const db = getDb();
    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, body.teamId),
          eq(teamMembers.userId, userId),
        ),
      )
      .limit(1);

    if (membership?.role !== "owner") {
      return jsonError("Only a team owner can create invite links.", 403);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(teamInvites).values({
      token,
      teamId: body.teamId,
      createdBy: userId,
      expiresAt,
    });

    return Response.json({ invitePath: `/join/${token}`, expiresAt });
  } catch (error) {
    console.error("Unable to create invite", error);
    return jsonError("Invite link could not be created.", 500);
  }
}
