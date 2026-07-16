"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { Task, TaskFilter } from "./task-types";

type BubbleFieldProps = {
  tasks: Task[];
  filter: TaskFilter;
  completingIds: Set<string>;
  onSelect: (task: Task) => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
};

const INITIAL_SPEED = 1.85;
const MAX_SPEED = 1.55;
const MIN_SPEED = 0.28;
const DRIFT_FORCE = 0.007;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function useBubblePhysics(taskIds: string[]) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const particles = useRef(new Map<string, Particle>());
  const reduceMotion = useReducedMotion();
  const signature = useMemo(() => taskIds.join("|"), [taskIds]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const ids = signature ? signature.split("|") : [];

    for (const existingId of particles.current.keys()) {
      if (!ids.includes(existingId)) particles.current.delete(existingId);
    }

    function tick(now: number) {
      const field = fieldRef.current;
      if (!field) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const width = field.clientWidth;
      const height = field.clientHeight;
      if (!width || !height) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const delta = Math.min((now - previous) / 16.667, 2);
      previous = now;

      ids.forEach((id, index) => {
        const node = nodeRefs.current.get(id);
        if (!node) return;
        const radius = node.offsetWidth / 2;
        const seed = hashString(id);
        let particle = particles.current.get(id);
        if (!particle) {
          const usableWidth = Math.max(20, width - radius * 2);
          const usableHeight = Math.max(20, height - radius * 2);
          particle = {
            x: Math.min(
              usableWidth,
              Math.max(0, ((seed % 997) / 997) * usableWidth),
            ),
            y: Math.min(
              usableHeight,
              Math.max(0, (((seed >> 3) % 991) / 991) * usableHeight),
            ),
            vx:
              (index % 2 ? -1 : 1) *
              (0.22 + (seed % 8) / 20) *
              INITIAL_SPEED,
            vy:
              (index % 3 ? 1 : -1) *
              (0.18 + (seed % 7) / 22) *
              INITIAL_SPEED,
            radius,
            phase: (seed % 628) / 100,
          };
          particles.current.set(id, particle);
        }
        particle.radius = radius;
      });

      const active = ids
        .map((id) => ({ id, particle: particles.current.get(id) }))
        .filter(
          (entry): entry is { id: string; particle: Particle } =>
            Boolean(entry.particle),
        );

      for (let first = 0; first < active.length; first += 1) {
        for (let second = first + 1; second < active.length; second += 1) {
          const a = active[first].particle;
          const b = active[second].particle;
          const ax = a.x + a.radius;
          const ay = a.y + a.radius;
          const bx = b.x + b.radius;
          const by = b.y + b.radius;
          const dx = bx - ax;
          const dy = by - ay;
          const distance = Math.max(0.01, Math.hypot(dx, dy));
          const minimum = a.radius + b.radius + 8;

          if (distance < minimum) {
            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = (minimum - distance) * 0.5;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const relativeVelocity =
              (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relativeVelocity < 0) {
              const impulse = relativeVelocity * 0.72;
              a.vx += impulse * nx;
              a.vy += impulse * ny;
              b.vx -= impulse * nx;
              b.vy -= impulse * ny;
            }
          }
        }
      }

      active.forEach(({ id, particle }) => {
        const diameter = particle.radius * 2;
        const maxX = Math.max(0, width - diameter);
        const maxY = Math.max(0, height - diameter);

        if (!reduceMotion) {
          particle.vx +=
            Math.sin(now / 1050 + particle.phase) * DRIFT_FORCE;
          particle.vy +=
            Math.cos(now / 1250 + particle.phase) * DRIFT_FORCE * 0.88;
          particle.vx *= 0.999;
          particle.vy *= 0.999;

          const speed = Math.hypot(particle.vx, particle.vy);
          if (speed > MAX_SPEED) {
            particle.vx = (particle.vx / speed) * MAX_SPEED;
            particle.vy = (particle.vy / speed) * MAX_SPEED;
          }
          if (speed < MIN_SPEED) {
            particle.vx += Math.sin(particle.phase) * 0.035;
            particle.vy += Math.cos(particle.phase) * 0.035;
          }

          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;
        }

        if (particle.x <= 0) {
          particle.x = 0;
          particle.vx = Math.abs(particle.vx) * 0.88;
        } else if (particle.x >= maxX) {
          particle.x = maxX;
          particle.vx = -Math.abs(particle.vx) * 0.88;
        }
        if (particle.y <= 0) {
          particle.y = 0;
          particle.vy = Math.abs(particle.vy) * 0.88;
        } else if (particle.y >= maxY) {
          particle.y = maxY;
          particle.vy = -Math.abs(particle.vy) * 0.88;
        }

        const node = nodeRefs.current.get(id);
        if (node) {
          node.style.translate = `${particle.x.toFixed(2)}px ${particle.y.toFixed(2)}px`;
        }
      });

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, signature]);

  function registerNode(id: string, node: HTMLDivElement | null) {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }

  return { fieldRef, registerNode };
}

export function BubbleField({
  tasks,
  filter,
  completingIds,
  onSelect,
}: BubbleFieldProps) {
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const { fieldRef, registerNode } = useBubblePhysics(taskIds);

  return (
    <div className="bubble-field" ref={fieldRef}>
      <div className="ambient-glow glow-one" aria-hidden="true" />
      <div className="ambient-glow glow-two" aria-hidden="true" />
      <div className="field-guide" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <motion.div
            className={`bubble-shell bubble-${task.priority}`}
            key={task.id}
            ref={(node) => registerNode(task.id, node)}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.35 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <button
              type="button"
              className={`task-bubble ${task.completed ? "is-completed" : ""} ${completingIds.has(task.id) ? "is-completing" : ""}`}
              onClick={() => onSelect(task)}
              aria-label={`${task.title}, ${task.priority} priority${task.dueDate ? `, due ${formatFullDate(task.dueDate)}` : ""}${task.completed ? ", completed" : ""}. Open task details.`}
            >
              <span className="bubble-glint" aria-hidden="true" />
              {task.completed && (
                <span className="bubble-check" aria-hidden="true">
                  ✓
                </span>
              )}
              <span className="bubble-title">{task.title}</span>
              {task.dueDate && task.priority !== "low" && (
                <span className="bubble-due">{formatShortDate(task.dueDate)}</span>
              )}
              <span className="completion-ripple" aria-hidden="true" />
            </button>
            <span className="bubble-tooltip" role="tooltip">
              <strong>{task.title}</strong>
              <span>
                {task.completed
                  ? "Completed"
                  : `${capitalize(task.priority)} priority`}
                {task.dueDate ? ` · Due ${formatShortDate(task.dueDate)}` : ""}
              </span>
              {task.description && <small>{task.description}</small>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {tasks.length === 0 && (
        <motion.div
          className="empty-orbit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="empty-bubbles" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <h2>{filter === "completed" ? "Nothing completed yet" : "Your orbit is clear"}</h2>
          <p>
            {filter === "completed"
              ? "Finish a task and it will drift into this space."
              : filter === "all"
                ? "Add a task and watch it float into view."
                : `No active ${filter}-priority tasks right now.`}
          </p>
        </motion.div>
      )}

      {tasks.length > 0 && (
        <div className="field-hint" aria-hidden="true">
          <span>↗</span> Tap a bubble to open it
        </div>
      )}
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
