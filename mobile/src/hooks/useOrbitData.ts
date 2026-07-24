import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, useUser } from "@clerk/expo";
import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useMemo, useState } from "react";
import { inviteUrl, orbitRequest } from "../api";
import type { SyncState, Task, TaskDraft, Team } from "../types";

type TaskResponse = { task: Task };
type TaskListResponse = { tasks: Task[] };
type TeamResponse = { team: Team };
type TeamListResponse = { teams: Team[] };
type InviteResponse = { invitePath: string; expiresAt: string };

type CachedOrbit = {
  tasks: Task[];
  teams: Team[];
};

export function useOrbitData() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [notice, setNotice] = useState("");

  const cacheKey = userId ? `orbit-mobile-cache:${userId}` : null;
  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Orbit member";

  const persist = useCallback(
    async (nextTasks: Task[], nextTeams: Team[]) => {
      if (!cacheKey) return;
      const value: CachedOrbit = { tasks: nextTasks, teams: nextTeams };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(value)).catch(() => {});
    },
    [cacheKey],
  );

  const load = useCallback(
    async (background = false) => {
      if (!userId) return;
      background ? setRefreshing(true) : setLoading(true);
      setSyncState("connecting");

      if (!background && cacheKey) {
        const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
        if (cached) {
          try {
            const value = JSON.parse(cached) as CachedOrbit;
            if (Array.isArray(value.tasks) && Array.isArray(value.teams)) {
              setTasks(value.tasks);
              setTeams(value.teams);
            }
          } catch {}
        }
      }

      try {
        const [taskResult, teamResult] = await Promise.all([
          orbitRequest<TaskListResponse>(getToken, "/api/tasks"),
          orbitRequest<TeamListResponse>(getToken, "/api/teams"),
        ]);
        setTasks(taskResult.tasks);
        setTeams(teamResult.teams);
        await persist(taskResult.tasks, teamResult.teams);
        setSyncState("synced");
      } catch (error) {
        setSyncState("offline");
        setNotice(messageFrom(error, "Orbit could not sync right now."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cacheKey, getToken, persist, userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const replaceTask = useCallback(
    (task: Task) => {
      setTasks((current) => {
        const next = current.map((item) => (item.id === task.id ? task : item));
        void persist(next, teams);
        return next;
      });
    },
    [persist, teams],
  );

  const addTask = useCallback(
    async (draft: TaskDraft) => {
      const optimistic: Task = {
        ...draft,
        ...(draft.teamId ? { createdBy: displayName } : {}),
        id: Crypto.randomUUID(),
        completed: false,
        createdAt: new Date().toISOString(),
      };

      setTasks((current) => [...current, optimistic]);
      setNotice("A new task joined your orbit.");

      try {
        const result = await orbitRequest<TaskResponse>(getToken, "/api/tasks", {
          method: "POST",
          body: JSON.stringify({ task: optimistic }),
        });
        replaceTask(result.task);
        setSyncState("synced");
        return result.task;
      } catch (error) {
        setTasks((current) => current.filter((task) => task.id !== optimistic.id));
        setSyncState("offline");
        setNotice(messageFrom(error, "That task could not be created."));
        throw error;
      }
    },
    [displayName, getToken, replaceTask],
  );

  const saveTask = useCallback(
    async (nextTask: Task) => {
      const previous = tasks.find((task) => task.id === nextTask.id);
      replaceTask(nextTask);

      try {
        const result = await orbitRequest<TaskResponse>(getToken, "/api/tasks", {
          method: "PATCH",
          body: JSON.stringify({ task: nextTask }),
        });
        replaceTask(result.task);
        setNotice("Changes saved.");
        setSyncState("synced");
        return result.task;
      } catch (error) {
        if (previous) replaceTask(previous);
        setSyncState("offline");
        setNotice(messageFrom(error, "Changes could not be saved."));
        throw error;
      }
    },
    [getToken, replaceTask, tasks],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      const nextTask: Task = task.completed
        ? { ...task, completed: false, completedAt: undefined }
        : {
            ...task,
            completed: true,
            completedAt: new Date().toISOString(),
          };

      await saveTask(nextTask);
      setNotice(
        nextTask.completed
          ? "Beautifully done. Bubble burst!"
          : "Task restored to your orbit.",
      );
      return nextTask;
    },
    [saveTask],
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      try {
        await orbitRequest<void>(
          getToken,
          `/api/tasks?id=${encodeURIComponent(task.id)}`,
          { method: "DELETE" },
        );
        setNotice("Task removed.");
        setSyncState("synced");
      } catch (error) {
        setTasks((current) =>
          [...current, task].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
          ),
        );
        setSyncState("offline");
        setNotice(messageFrom(error, "The task could not be deleted."));
        throw error;
      }
    },
    [getToken],
  );

  const createTeam = useCallback(
    async (name: string) => {
      try {
        const result = await orbitRequest<TeamResponse>(getToken, "/api/teams", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        setTeams((current) => [...current, result.team]);
        setNotice(`${result.team.name} is ready.`);
        return result.team;
      } catch (error) {
        setNotice(messageFrom(error, "The team could not be created."));
        throw error;
      }
    },
    [getToken],
  );

  const createInvite = useCallback(
    async (teamId: string) => {
      try {
        const result = await orbitRequest<InviteResponse>(
          getToken,
          "/api/teams",
          {
            method: "PATCH",
            body: JSON.stringify({ action: "invite", teamId }),
          },
        );
        return inviteUrl(result.invitePath);
      } catch (error) {
        setNotice(messageFrom(error, "The invite could not be created."));
        throw error;
      }
    },
    [getToken],
  );

  const counts = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    return {
      total: tasks.length,
      active: tasks.length - completed,
      completed,
      high: tasks.filter(
        (task) => task.priority === "high" && !task.completed,
      ).length,
    };
  }, [tasks]);

  return {
    tasks,
    teams,
    counts,
    loading,
    refreshing,
    syncState,
    notice,
    setNotice,
    displayName,
    refresh: () => load(true),
    addTask,
    saveTask,
    toggleTask,
    deleteTask,
    createTeam,
    createInvite,
  };
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
