"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PRIORITIES, Priority, Task } from "./task-types";

type TaskDialogProps = {
  task: Task;
  onClose: () => void;
  onSave: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  teamName?: string;
};

export function TaskDialog({
  task,
  onClose,
  onSave,
  onToggleComplete,
  onDelete,
  teamName,
}: TaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function getEditedTask(): Task {
    return {
      ...task,
      title: title.trim() || task.title,
      priority,
      description: description.trim(),
      dueDate,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(getEditedTask());
    onClose();
  }

  function handleComplete() {
    const editedTask = getEditedTask();
    onToggleComplete(editedTask);
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(task);
  }

  return (
    <motion.div
      className="dialog-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className="task-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 330, damping: 28 }}
      >
        <div className="dialog-topline">
          <div>
            <span className={`dialog-orb orb-${priority}`} aria-hidden="true" />
            <span>{task.completed ? "Completed task" : "Task details"}</span>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Close task details"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="dialog-title-label" htmlFor="edit-title">
            Task title
          </label>
          <input
            ref={titleRef}
            id="edit-title"
            className="dialog-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={72}
          />
          <h2 className="sr-only" id="task-dialog-title">
            Edit {task.title}
          </h2>

          <fieldset className="dialog-priorities">
            <legend>Priority</legend>
            <div>
              {PRIORITIES.map((option) => (
                <label
                  key={option.value}
                  className={`dialog-priority dialog-priority-${option.value}`}
                >
                  <input
                    type="radio"
                    name="edit-priority"
                    checked={priority === option.value}
                    onChange={() => setPriority(option.value)}
                  />
                  <span aria-hidden="true" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="dialog-fields">
            <label>
              <span>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="No description yet"
                maxLength={180}
              />
            </label>
          </div>

          <div className="task-meta">
            <span>{teamName ? `Shared in ${teamName}` : "Private task"}</span>
            {teamName && <span>Created by {task.createdBy ?? "Orbit member"}</span>}
            <span>Created {formatDate(task.createdAt)}</span>
            {task.completedAt && (
              <span>Completed {formatDate(task.completedAt)}</span>
            )}
          </div>

          <div className="dialog-actions">
            <motion.button
              type="button"
              className={`complete-button ${task.completed ? "restore" : ""}`}
              onClick={handleComplete}
              whileTap={{ scale: 0.97 }}
            >
              <span aria-hidden="true">{task.completed ? "↺" : "✓"}</span>
              {task.completed ? "Restore task" : "Mark complete"}
            </motion.button>
            <button className="save-button" type="submit">
              Save changes
            </button>
          </div>

          <button
            className={`delete-button ${confirmDelete ? "confirm" : ""}`}
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? "Click again to delete" : "Delete task"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
