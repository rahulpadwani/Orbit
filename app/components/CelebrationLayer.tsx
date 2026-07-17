"use client";

import { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";

const COLORS = ["#ff6f86", "#8d73f4", "#42c8bc", "#ffd166", "#70b7ff"];

export function CelebrationLayer({ title }: { title: string }) {
  const reduceMotion = useReducedMotion();

  if (typeof document === "undefined") return null;

  const layer = (
    <motion.div
      className="celebration-layer"
      role="status"
      aria-live="assertive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span className="celebration-flash" aria-hidden="true" />
      <span className="celebration-wave wave-one" aria-hidden="true" />
      <span className="celebration-wave wave-two" aria-hidden="true" />

      <div className="celebration-confetti" aria-hidden="true">
        {Array.from({ length: 42 }, (_, index) => {
          const style = {
            "--confetti-x": `${3 + ((index * 37) % 94)}%`,
            "--confetti-delay": `${(index % 9) * 34}ms`,
            "--confetti-drift": `${-75 + ((index * 29) % 150)}px`,
            "--confetti-rotation": `${120 + ((index * 47) % 440)}deg`,
            "--confetti-color": COLORS[index % COLORS.length],
          } as CSSProperties;
          return <i key={index} style={style} />;
        })}
      </div>

      <div className="celebration-copy-anchor">
        <motion.div
          className="celebration-copy"
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.55, y: reduceMotion ? 0 : 30 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: reduceMotion ? 1 : [0.55, 1.08, 1, 0.96],
            y: reduceMotion ? 0 : [30, 0, 0, -16],
          }}
          transition={{ duration: 1.85, times: [0, 0.18, 0.72, 1], ease: "easeOut" }}
        >
          <span aria-hidden="true">✓</span>
          <strong>Bubble burst!</strong>
          <small>{title} is complete</small>
        </motion.div>
      </div>
    </motion.div>
  );

  return createPortal(layer, document.fullscreenElement ?? document.body);
}
