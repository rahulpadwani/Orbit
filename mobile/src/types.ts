export type Priority = "high" | "medium" | "low";

export type TaskFilter = "all" | Priority | "completed";

export type Task = {
  id: string;
  teamId?: string;
  createdBy?: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export type TaskDraft = Pick<
  Task,
  "title" | "description" | "dueDate" | "priority"
> & {
  teamId?: string;
};

export type Team = {
  id: string;
  name: string;
  role: "owner" | "member";
  memberCount: number;
  createdAt: string;
};

export type WorkspaceId = "all" | "personal" | string;

export type SyncState = "connecting" | "synced" | "offline";

export const PRIORITIES: Array<{
  value: Priority;
  label: string;
  color: string;
  darkColor: string;
}> = [
  {
    value: "high",
    label: "High",
    color: "#ef5b6d",
    darkColor: "#b73554",
  },
  {
    value: "medium",
    label: "Medium",
    color: "#7358e8",
    darkColor: "#4931b9",
  },
  {
    value: "low",
    label: "Low",
    color: "#20a59b",
    darkColor: "#117970",
  },
];
