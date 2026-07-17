"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BubbleField } from "./components/BubbleField";
import { CelebrationLayer } from "./components/CelebrationLayer";
import { Dashboard } from "./components/Dashboard";
import { OrbitalAssistant } from "./components/OrbitalAssistant";
import { TeamSwitcher } from "./components/TeamSwitcher";
import { TaskComposer } from "./components/TaskComposer";
import { TaskDialog } from "./components/TaskDialog";
import {
  Priority,
  Task,
  TaskFilter,
  Team,
  WorkspaceId,
} from "./components/task-types";

const STORAGE_KEY = "orbit-tasks-v1";
const THEME_KEY = "orbit-theme";

type SyncStatus = "loading" | "synced" | "offline";

type TaskListResponse = {
  tasks: Task[];
  needsMigration?: boolean;
};

type TeamListResponse = { teams: Team[] };

function storedTasks(value: string | null): Task[] | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Task[]) : null;
  } catch {
    return null;
  }
}

async function taskRequest<T>(init?: RequestInit, url = "/api/tasks"): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Cloud sync failed.");
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function starterTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: "starter-launch",
      title: "Polish launch story",
      description: "Tighten the narrative and add the latest customer quote.",
      dueDate: dateInDays(1),
      priority: "high",
      completed: false,
      createdAt: now,
    },
    {
      id: "starter-review",
      title: "Design review",
      description: "Share the final interaction notes with the product team.",
      dueDate: dateInDays(3),
      priority: "medium",
      completed: false,
      createdAt: now,
    },
    {
      id: "starter-metrics",
      title: "Check weekly metrics",
      description: "Look for changes in activation and week-one retention.",
      dueDate: dateInDays(5),
      priority: "medium",
      completed: false,
      createdAt: now,
    },
    {
      id: "starter-inspiration",
      title: "Save three ideas",
      description: "Add a few references to the inspiration board.",
      dueDate: "",
      priority: "low",
      completed: false,
      createdAt: now,
    },
  ];
}

export default function TaskBoard() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceId>("all");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [celebration, setCelebration] = useState<{ key: number; title: string } | null>(null);
  const orbitPanelRef = useRef<HTMLElement>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const userStorageKey = user ? `${STORAGE_KEY}:${user.id}` : null;
  const displayName =
    user?.firstName ?? user?.primaryEmailAddress?.emailAddress.split("@")[0] ?? "you";

  useEffect(() => {
    if (!userStorageKey) return;
    let cancelled = false;

    const savedTasks = storedTasks(window.localStorage.getItem(userStorageKey));
    const legacyTasks = storedTasks(window.localStorage.getItem(STORAGE_KEY));
    const tasksToMigrate = savedTasks ?? legacyTasks ?? starterTasks();
    let nextTheme: "light" | "dark" = "light";

    try {
      if (savedTasks === null && legacyTasks !== null) {
        window.localStorage.setItem(userStorageKey, JSON.stringify(legacyTasks));
        window.localStorage.removeItem(STORAGE_KEY);
      }
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const preferredDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      nextTheme = savedTheme === "dark" || (!savedTheme && preferredDark) ? "dark" : "light";
    } catch {}

    async function loadCloudTasks() {
      await Promise.resolve();
      if (cancelled) return;
      setTheme(nextTheme);

      try {
        const [initialResult, teamResult] = await Promise.all([
          taskRequest<TaskListResponse>({ cache: "no-store" }),
          taskRequest<TeamListResponse>({ cache: "no-store" }, "/api/teams"),
        ]);
        let result = initialResult;

        if (result.needsMigration) {
          result = await taskRequest<TaskListResponse>({
            method: "POST",
            body: JSON.stringify({ tasks: tasksToMigrate, initialize: true }),
          });
        }

        if (!cancelled) {
          setTasks(result.tasks);
          setTeams(teamResult.teams);
          setSyncStatus("synced");
        }
      } catch {
        if (!cancelled) {
          setTasks(tasksToMigrate);
          setSyncStatus("offline");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void loadCloudTasks();
    return () => {
      cancelled = true;
    };
  }, [userStorageKey]);

  useEffect(() => {
    if (!hydrated || !userStorageKey) return;
    window.localStorage.setItem(userStorageKey, JSON.stringify(tasks));
  }, [hydrated, tasks, userStorageKey]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (hydrated) window.localStorage.setItem(THEME_KEY, theme);
  }, [hydrated, theme]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    },
    [],
  );

  useEffect(() => {
    function handleFullscreenChange() {
      setIsPresenting(document.fullscreenElement === orbitPanelRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;

  const workspaceTasks = useMemo(() => {
    if (workspace === "all") return tasks;
    if (workspace === "personal") return tasks.filter((task) => !task.teamId);
    return tasks.filter((task) => task.teamId === workspace);
  }, [tasks, workspace]);

  const visibleTasks = useMemo(() => {
    if (filter === "completed") {
      return workspaceTasks.filter((task) => task.completed);
    }
    return workspaceTasks.filter(
      (task) =>
        !task.completed && (filter === "all" || task.priority === filter),
    );
  }, [filter, workspaceTasks]);

  const closeDialog = useCallback(() => setSelectedId(null), []);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function celebrate(title: string) {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setCelebration({ key: Date.now(), title });
    celebrationTimer.current = setTimeout(() => setCelebration(null), 2100);
  }

  function addTask(
    input: Omit<Task, "id" | "createdAt" | "completed">,
  ) {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const task: Task = {
      ...input,
      ...(input.teamId ? { createdBy: displayName } : {}),
      id,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [...current, task]);
    if (workspace !== "all") setWorkspace(task.teamId ?? "personal");
    setFilter("all");
    notify("A new task joined your orbit.");
    void taskRequest<{ task: Task }>({
      method: "POST",
      body: JSON.stringify({ task }),
    })
      .then(({ task: savedTask }) => {
        setTasks((current) =>
          current.map((item) => (item.id === savedTask.id ? savedTask : item)),
        );
        setSyncStatus("synced");
      })
      .catch(() => {
        setTasks((current) => current.filter((item) => item.id !== task.id));
        setSyncStatus("offline");
        notify("That task could not be synced. Please try again.");
      });
  }

  function saveTask(updatedTask: Task) {
    const previousTask = tasks.find((task) => task.id === updatedTask.id);
    setTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
    notify("Changes saved.");
    void taskRequest<{ task: Task }>({
      method: "PATCH",
      body: JSON.stringify({ task: updatedTask }),
    })
      .then(({ task }) => {
        setTasks((current) =>
          current.map((item) => (item.id === task.id ? task : item)),
        );
        setSyncStatus("synced");
      })
      .catch(() => {
        if (previousTask) {
          setTasks((current) =>
            current.map((item) => (item.id === previousTask.id ? previousTask : item)),
          );
        }
        setSyncStatus("offline");
        notify("Changes were not synced. Please try again.");
      });
  }

  function toggleComplete(task: Task) {
    if (task.completed) {
      const restoredTask = { ...task, completed: false, completedAt: undefined };
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? restoredTask : item,
        ),
      );
      setFilter("all");
      setSelectedId(null);
      notify("Task restored to your orbit.");
      void taskRequest<{ task: Task }>({
        method: "PATCH",
        body: JSON.stringify({ task: restoredTask }),
      })
        .then(() => setSyncStatus("synced"))
        .catch(() => {
          setTasks((current) =>
            current.map((item) => (item.id === task.id ? task : item)),
          );
          setSyncStatus("offline");
          notify("The task could not be restored. Please try again.");
        });
      return;
    }

    setSelectedId(null);
    celebrate(task.title);
    setCompletingIds((current) => new Set(current).add(task.id));
    window.setTimeout(() => {
      const completedTask: Task = {
        ...task,
        completed: true,
        completedAt: new Date().toISOString(),
      };
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? completedTask : item,
        ),
      );
      setCompletingIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
      notify("Beautifully done. Task completed!");
      void taskRequest<{ task: Task }>({
        method: "PATCH",
        body: JSON.stringify({ task: completedTask }),
      })
        .then(() => setSyncStatus("synced"))
        .catch(() => {
          setTasks((current) =>
            current.map((item) => (item.id === task.id ? task : item)),
          );
          setSyncStatus("offline");
          notify("Completion was not synced. Please try again.");
        });
    }, 760);
  }

  function deleteTask(task: Task) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setSelectedId(null);
    notify("Task removed.");
    void taskRequest<void>(
      { method: "DELETE" },
      `/api/tasks?id=${encodeURIComponent(task.id)}`,
    )
      .then(() => setSyncStatus("synced"))
      .catch(() => {
        setTasks((current) =>
          [...current, task].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        );
        setSyncStatus("offline");
        notify("The task could not be deleted. Please try again.");
      });
  }

  function handleFilterChange(nextFilter: TaskFilter) {
    setFilter(nextFilter);
  }

  function handleTeamCreated(team: Team) {
    setTeams((current) => [...current, team]);
    setWorkspace(team.id);
  }

  async function togglePresentation() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await orbitPanelRef.current?.requestFullscreen();
      }
    } catch {
      notify("Full-screen mode is not available in this browser.");
    }
  }

  const activeCount = tasks.filter((task) => !task.completed).length;
  const orbitName =
    workspace === "all"
      ? "All workspaces"
      : workspace === "personal"
        ? "My space"
        : teams.find((team) => team.id === workspace)?.name ?? "Team space";
  const filterTitle =
    filter === "all"
      ? `${orbitName} orbit`
      : filter === "completed"
        ? `${orbitName} completed`
        : `${orbitName} · ${capitalize(filter)} priority`;
  const selectedTeam = teams.find((team) => team.id === selectedTask?.teamId);
  const targetTeam = teams.find((team) => team.id === workspace);

  return (
    <main className="orbit-app">
      <div className="app-grid">
        <aside className="control-panel" aria-label="Task controls">
          <header className="brand-row">
            <div className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div>
              <p className="brand-name">Orbit</p>
              <p className="brand-tagline">Make space for what matters.</p>
            </div>
          </header>

          <div className="mobile-panel-label">
            <span>{activeCount} active tasks</span>
            <span aria-hidden="true">·</span>
            <span>
              {syncStatus === "synced"
                ? "Cloud synced"
                : syncStatus === "loading"
                  ? "Connecting"
                  : "Sync unavailable"}
            </span>
          </div>

          <TeamSwitcher
            teams={teams}
            tasks={tasks}
            workspace={workspace}
            onWorkspaceChange={setWorkspace}
            onTeamCreated={handleTeamCreated}
            onNotify={notify}
          />
          <TaskComposer
            key={workspace}
            onAdd={addTask}
            teams={teams}
            defaultTeamId={targetTeam?.id}
          />
          <OrbitalAssistant
            onAdd={addTask}
            teamId={targetTeam?.id}
            workspaceName={targetTeam?.name ?? "My space"}
          />
          <Dashboard
            tasks={tasks}
            filter={filter}
            onFilterChange={handleFilterChange}
          />

          <p className="storage-note">
            <span aria-hidden="true">
              {syncStatus === "synced" ? "●" : syncStatus === "loading" ? "◌" : "!"}
            </span>
            {syncStatus === "synced"
              ? `${displayName}'s personal and shared tasks sync across devices.`
              : syncStatus === "loading"
                ? "Connecting to your private task cloud…"
                : "Cloud sync is unavailable. Reconnect before making changes."}
          </p>
        </aside>

        <section
          ref={orbitPanelRef}
          className={`orbit-panel ${isPresenting ? "is-presenting" : ""}`}
          aria-labelledby="orbit-title"
        >
          <header className="orbit-header">
            <div>
              <div className="live-label">
                <span aria-hidden="true" />
                Live focus space
              </div>
              <h1 id="orbit-title">{filterTitle}</h1>
              <p>
                {visibleTasks.length === 0
                  ? "A little breathing room."
                  : `${visibleTasks.length} ${visibleTasks.length === 1 ? "task is" : "tasks are"} gently in motion.`}
              </p>
            </div>
            <div className="header-actions">
              {isPresenting && <span className="presentation-label">Presentation mode</span>}
              <div className="priority-legend" aria-label="Bubble size legend">
                <span><i className="legend-high" />High</span>
                <span><i className="legend-medium" />Medium</span>
                <span><i className="legend-low" />Low</span>
              </div>
              <motion.button
                className="presentation-button"
                type="button"
                onClick={togglePresentation}
                whileTap={{ scale: 0.94 }}
                aria-label={isPresenting ? "Exit full-screen presentation" : "Open full-screen presentation"}
                title={isPresenting ? "Exit presentation" : "Present on a big screen"}
              >
                <span aria-hidden="true">{isPresenting ? "↙" : "⛶"}</span>
                <span>{isPresenting ? "Exit" : "Present"}</span>
              </motion.button>
              <motion.button
                className="theme-button"
                type="button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                whileTap={{ scale: 0.92 }}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <span aria-hidden="true">{theme === "light" ? "☾" : "☼"}</span>
              </motion.button>
              <div className="account-chip">
                <span>
                  <small>Signed in as</small>
                  {displayName}
                </span>
                <UserButton
                  showName={false}
                  appearance={{
                    elements: {
                      avatarBox: "orbit-user-avatar",
                    },
                  }}
                />
              </div>
            </div>
          </header>

          <BubbleField
            tasks={hydrated ? visibleTasks : []}
            filter={filter}
            completingIds={completingIds}
            onSelect={(task) => setSelectedId(task.id)}
            onLongComplete={toggleComplete}
          />
        </section>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDialog
            key={selectedTask.id}
            task={selectedTask}
            onClose={closeDialog}
            onSave={saveTask}
            onToggleComplete={toggleComplete}
            onDelete={deleteTask}
            teamName={selectedTeam?.name}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebration && (
          <CelebrationLayer key={celebration.key} title={celebration.title} />
        )}
      </AnimatePresence>

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
            >
              <span aria-hidden="true">✦</span>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function capitalize(value: Priority) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
