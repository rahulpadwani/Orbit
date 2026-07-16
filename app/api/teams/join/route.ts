import { auth } from "@clerk/nextjs/server";
import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orbitUsers, teamInvites, teamMembers, teams } from "../../../../db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return jsonError("Sign in to join this team.", 401);

  try {
    const body = (await request.json()) as { token?: unknown };
    if (
      typeof body.token !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(body.token)
    ) {
      return jsonError("This invite link is invalid.", 400);
    }

    const db = getDb();
    const [invite] = await db
      .select({
        teamId: teamInvites.teamId,
        teamName: teams.name,
        createdAt: teams.createdAt,
      })
      .from(teamInvites)
      .innerJoin(teams, eq(teamInvites.teamId, teams.id))
      .where(
        and(
          eq(teamInvites.token, body.token),
          gt(teamInvites.expiresAt, new Date().toISOString()),
        ),
      )
      .limit(1);

    if (!invite) return jsonError("This invite link has expired or is invalid.", 404);

    await db.insert(orbitUsers).values({ userId }).onConflictDoNothing();
    await db
      .insert(teamMembers)
      .values({ teamId: invite.teamId, userId, role: "member" })
      .onConflictDoNothing();

    const [memberTotal] = await db
      .select({ memberCount: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, invite.teamId));

    return Response.json({
      team: {
        id: invite.teamId,
        name: invite.teamName,
        role: "member",
        memberCount: Number(memberTotal.memberCount),
        createdAt: invite.createdAt,
      },
    });
  } catch (error) {
    console.error("Unable to join team", error);
    return jsonError("You could not join this team right now.", 500);
  }
}
