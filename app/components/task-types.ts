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

export type Team = {
  id: string;
  name: string;
  role: "owner" | "member";
  memberCount: number;
  createdAt: string;
};

export type WorkspaceId = "all" | "personal" | string;

export const PRIORITIES: Array<{
  value: Priority;
  label: string;
  hint: string;
}> = [
  { value: "high", label: "High", hint: "Big focus" },
  { value: "medium", label: "Medium", hint: "Keep moving" },
  { value: "low", label: "Low", hint: "Nice to do" },
];
