export type Priority = "high" | "medium" | "low";

export type TaskFilter = "all" | Priority | "completed";

export type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export const PRIORITIES: Array<{
  value: Priority;
  label: string;
  hint: string;
}> = [
  { value: "high", label: "High", hint: "Big focus" },
  { value: "medium", label: "Medium", hint: "Keep moving" },
  { value: "low", label: "Low", hint: "Nice to do" },
];

