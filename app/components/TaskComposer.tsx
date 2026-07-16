"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { PRIORITIES, Priority, Task } from "./task-types";

type TaskComposerProps = {
  onAdd: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
};

export function TaskComposer({ onAdd }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    onAdd({
      title: cleanTitle,
      priority,
      description: description.trim(),
      dueDate,
    });
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="section-kicker">
        <span className="section-kicker-dot" aria-hidden="true" />
        Add a task
      </div>

      <label className="sr-only" htmlFor="task-title">
        Task title
      </label>
      <div className="title-input-wrap">
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs your attention?"
          maxLength={72}
          autoComplete="off"
        />
        <span className="title-count" aria-hidden="true">
          {title.length}/72
        </span>
      </div>

      <fieldset className="priority-fieldset">
        <legend>Choose priority</legend>
        <div className="priority-options">
          {PRIORITIES.map((option) => (
            <label
              className={`priority-option priority-${option.value}`}
              key={option.value}
            >
              <input
                type="radio"
                name="priority"
                value={option.value}
                checked={priority === option.value}
                onChange={() => setPriority(option.value)}
              />
              <span className="priority-orb" aria-hidden="true" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="composer-details">
        <label>
          <span>Due date <em>optional</em></span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <label>
          <span>Description <em>optional</em></span>
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a little context..."
            maxLength={180}
          />
        </label>
      </div>

      <motion.button
        type="submit"
        className="add-button"
        whileTap={{ scale: 0.97 }}
        disabled={!title.trim()}
      >
        <span aria-hidden="true">+</span>
        Add to my orbit
      </motion.button>
    </form>
  );
}

