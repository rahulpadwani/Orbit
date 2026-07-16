"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BubbleField } from "./components/BubbleField";
import { Dashboard } from "./components/Dashboard";
import { TaskComposer } from "./components/TaskComposer";
import { TaskDialog } from "./components/TaskDialog";
import { Priority, Task, TaskFilter } from "./components/task-types";

const STORAGE_KEY = "orbit-tasks-v1";
const THEME_KEY = "orbit-theme";

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
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStorageKey = user ? `${STORAGE_KEY}:${user.id}` : null;
  const displayName =
    user?.firstName ?? user?.primaryEmailAddress?.emailAddress.split("@")[0] ?? "you";

  useEffect(() => {
    if (!userStorageKey) return;
    setHydrated(false);
    setTasks([]);
    try {
      const savedTasks = window.localStorage.getItem(userStorageKey);
      const legacyTasks = window.localStorage.getItem(STORAGE_KEY);
      const tasksToLoad = savedTasks ?? legacyTasks;
      setTasks(tasksToLoad ? JSON.parse(tasksToLoad) : starterTasks());
      if (!savedTasks && legacyTasks) {
        window.localStorage.setItem(userStorageKey, legacyTasks);
        window.localStorage.removeItem(STORAGE_KEY);
      }
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const preferredDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setTheme(savedTheme === "dark" || (!savedTheme && preferredDark) ? "dark" : "light");
    } catch {
      setTasks(starterTasks());
    } finally {
      setHydrated(true);
    }
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
    },
    [],
  );

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;

  const visibleTasks = useMemo(() => {
    if (filter === "completed") {
      return tasks.filter((task) => task.completed);
    }
    return tasks.filter(
      (task) =>
        !task.completed && (filter === "all" || task.priority === filter),
    );
  }, [filter, tasks]);

  const closeDialog = useCallback(() => setSelectedId(null), []);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function addTask(
    input: Omit<Task, "id" | "createdAt" | "completed">,
  ) {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setTasks((current) => [
      ...current,
      {
        ...input,
        id,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setFilter("all");
    notify("A new task joined your orbit.");
  }

  function saveTask(updatedTask: Task) {
    setTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
    notify("Changes saved.");
  }

  function toggleComplete(task: Task) {
    if (task.completed) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, completed: false, completedAt: undefined }
            : item,
        ),
      );
      setFilter("all");
      setSelectedId(null);
      notify("Task restored to your orbit.");
      return;
    }

    setSelectedId(null);
    setCompletingIds((current) => new Set(current).add(task.id));
    window.setTimeout(() => {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                completed: true,
                completedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setCompletingIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
      notify("Beautifully done. Task completed!");
    }, 760);
  }

  function deleteTask(task: Task) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setSelectedId(null);
    notify("Task removed.");
  }

  function handleFilterChange(nextFilter: TaskFilter) {
    setFilter(nextFilter);
  }

  const activeCount = tasks.filter((task) => !task.completed).length;
  const filterTitle =
    filter === "all"
      ? "Your task orbit"
      : filter === "completed"
        ? "Completed constellation"
        : `${capitalize(filter)}-priority orbit`;

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
            <span>Stored on this device</span>
          </div>

          <TaskComposer onAdd={addTask} />
          <Dashboard
            tasks={tasks}
            filter={filter}
            onFilterChange={handleFilterChange}
          />

          <p className="storage-note">
            <span aria-hidden="true">◎</span>
            {displayName}&apos;s tasks are saved privately on this device.
          </p>
        </aside>

        <section className="orbit-panel" aria-labelledby="orbit-title">
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
              <div className="priority-legend" aria-label="Bubble size legend">
                <span><i className="legend-high" />High</span>
                <span><i className="legend-medium" />Medium</span>
                <span><i className="legend-low" />Low</span>
              </div>
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
          />
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
