"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Team } from "./task-types";

export function JoinTeamCard({ token }: { token: string }) {
  const [status, setStatus] = useState<"joining" | "joined" | "error">("joining");
  const [team, setTeam] = useState<Team | null>(null);
  const [message, setMessage] = useState("Connecting you to the team…");

  useEffect(() => {
    let cancelled = false;

    async function join() {
      try {
        const response = await fetch("/api/teams/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = (await response.json()) as { team?: Team; error?: string };
        if (!response.ok || !body.team) throw new Error(body.error ?? "Unable to join team.");
        if (!cancelled) {
          setTeam(body.team);
          setStatus("joined");
          setMessage(`You are now part of ${body.team.name}.`);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Unable to join this team.");
        }
      }
    }

    void join();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className={`join-result join-${status}`}>
      <span className="join-orb" aria-hidden="true">
        {status === "joined" ? "✓" : status === "error" ? "!" : "···"}
      </span>
      <p>{message}</p>
      {team && <small>{team.memberCount} team members</small>}
      <Link href="/">Open Orbit</Link>
    </div>
  );
}
