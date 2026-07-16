"use client";

import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Task, Team, WorkspaceId } from "./task-types";

type TeamSwitcherProps = {
  teams: Team[];
  tasks: Task[];
  workspace: WorkspaceId;
  onWorkspaceChange: (workspace: WorkspaceId) => void;
  onTeamCreated: (team: Team) => void;
  onNotify: (message: string) => void;
};

async function teamRequest<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/teams", {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(body?.error ?? "Team action failed.");
  return body as T;
}

export function TeamSwitcher({
  teams,
  tasks,
  workspace,
  onWorkspaceChange,
  onTeamCreated,
  onNotify,
}: TeamSwitcherProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const selectedTeam = teams.find((team) => team.id === workspace);

  const counts = useMemo(() => {
    const active = tasks.filter((task) => !task.completed);
    return {
      all: active.length,
      personal: active.filter((task) => !task.teamId).length,
      byTeam: new Map(
        teams.map((team) => [
          team.id,
          active.filter((task) => task.teamId === team.id).length,
        ]),
      ),
    };
  }, [tasks, teams]);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) return;
    setBusy(true);
    setError("");
    try {
      const result = await teamRequest<{ team: Team }>({
        method: "POST",
        body: JSON.stringify({ name: cleanName }),
      });
      onTeamCreated(result.team);
      setName("");
      setCreating(false);
      onNotify(`${result.team.name} is ready for teammates.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Team creation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createInvite() {
    if (!selectedTeam) return;
    setBusy(true);
    setError("");
    try {
      const result = await teamRequest<{ invitePath: string }>({
        method: "PATCH",
        body: JSON.stringify({ action: "invite", teamId: selectedTeam.id }),
      });
      const url = `${window.location.origin}${result.invitePath}`;
      setInviteUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        onNotify("Team invite copied to your clipboard.");
      } catch {
        onNotify("Invite created. Copy the link below.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Invite creation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="team-switcher" aria-labelledby="workspace-title">
      <div className="team-switcher-heading">
        <div>
          <div className="section-kicker">
            <span className="section-kicker-dot team-dot" aria-hidden="true" />
            Workspaces
          </div>
          <h2 id="workspace-title">Personal + teams</h2>
        </div>
        <button
          type="button"
          className="team-create-toggle"
          onClick={() => {
            setCreating((value) => !value);
            setError("");
          }}
          aria-expanded={creating}
          aria-controls="create-team-form"
        >
          {creating ? "Cancel" : "+ Team"}
        </button>
      </div>

      <div className="workspace-list" aria-label="Choose a workspace">
        <WorkspaceButton
          active={workspace === "all"}
          label="All tasks"
          detail="Everything you can access"
          count={counts.all}
          onClick={() => onWorkspaceChange("all")}
        />
        <WorkspaceButton
          active={workspace === "personal"}
          label="My space"
          detail="Private tasks"
          count={counts.personal}
          onClick={() => onWorkspaceChange("personal")}
        />
        {teams.map((team) => (
          <WorkspaceButton
            key={team.id}
            active={workspace === team.id}
            label={team.name}
            detail={`${team.memberCount} ${team.memberCount === 1 ? "member" : "members"}`}
            count={counts.byTeam.get(team.id) ?? 0}
            onClick={() => onWorkspaceChange(team.id)}
            team
          />
        ))}
      </div>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.form
            id="create-team-form"
            className="create-team-form"
            onSubmit={createTeam}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label htmlFor="team-name">Team name</label>
            <div>
              <input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Launch crew"
                maxLength={50}
                autoFocus
              />
              <button type="submit" disabled={busy || name.trim().length < 2}>
                Create
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {selectedTeam?.role === "owner" && (
        <div className="team-invite-block">
          <button type="button" onClick={createInvite} disabled={busy}>
            <span aria-hidden="true">↗</span>
            Invite teammates
          </button>
          {inviteUrl && (
            <input
              aria-label="Shareable team invite link"
              value={inviteUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          )}
        </div>
      )}

      {error && <p className="team-error" role="alert">{error}</p>}
    </section>
  );
}

function WorkspaceButton({
  active,
  label,
  detail,
  count,
  onClick,
  team = false,
}: {
  active: boolean;
  label: string;
  detail: string;
  count: number;
  onClick: () => void;
  team?: boolean;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={`workspace-icon ${team ? "is-team" : ""}`} aria-hidden="true">
        {team ? "◎" : label === "All tasks" ? "✦" : "●"}
      </span>
      <span className="workspace-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="workspace-count">{count}</span>
    </button>
  );
}
