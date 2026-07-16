"use client";

import { motion } from "framer-motion";
import { Task, TaskFilter } from "./task-types";

type DashboardProps = {
  tasks: Task[];
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
};

const FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "completed", label: "Completed" },
];

export function Dashboard({ tasks, filter, onFilterChange }: DashboardProps) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const active = total - completed;
  const high = tasks.filter(
    (task) => task.priority === "high" && !task.completed,
  ).length;

  const counts: Record<TaskFilter, number> = {
    all: active,
    high: high,
    medium: tasks.filter(
      (task) => task.priority === "medium" && !task.completed,
    ).length,
    low: tasks.filter((task) => task.priority === "low" && !task.completed)
      .length,
    completed,
  };

  return (
    <div className="dashboard-block">
      <div className="stats-grid" aria-label="Task summary">
        <StatCard label="Total" value={total} tone="violet" />
        <StatCard label="Active" value={active} tone="mint" />
        <StatCard label="Done" value={completed} tone="blue" />
        <StatCard label="High" value={high} tone="coral" />
      </div>

      <div className="filter-block">
        <div className="section-kicker">
          <span className="section-kicker-dot cool" aria-hidden="true" />
          View
        </div>
        <div className="filters" aria-label="Filter tasks">
          {FILTERS.map((item) => (
            <button
              className={filter === item.value ? "active" : ""}
              type="button"
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              aria-pressed={filter === item.value}
            >
              <span>{item.label}</span>
              <span className="filter-count">{counts[item.value]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "violet" | "mint" | "blue" | "coral";
}) {
  return (
    <motion.div
      className={`stat-card stat-${tone}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.div>
  );
}

