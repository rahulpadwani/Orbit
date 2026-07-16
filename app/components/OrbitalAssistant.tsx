"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Priority, Task } from "./task-types";

type SpeechResultEvent = Event & {
  results: { [index: number]: { [index: number]: { transcript: string } } };
};

type SpeechErrorEvent = Event & { error?: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type OrbitalAssistantProps = {
  onAdd: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
  teamId?: string;
  workspaceName: string;
};

function localDateInDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextWeekday(targetDay: number) {
  const today = new Date().getDay();
  let distance = (targetDay - today + 7) % 7;
  if (distance === 0) distance = 7;
  return localDateInDays(distance);
}

function parseVoiceTask(transcript: string, teamId?: string) {
  let title = transcript.trim();
  let priority: Priority = "medium";
  let dueDate = "";

  if (/\b(high priority|urgent|important)\b/i.test(title)) priority = "high";
  if (/\b(low priority|someday|whenever)\b/i.test(title)) priority = "low";

  if (/\b(today|tonight)\b/i.test(title)) dueDate = localDateInDays(0);
  else if (/\btomorrow\b/i.test(title)) dueDate = localDateInDays(1);
  else if (/\bnext week\b/i.test(title)) dueDate = localDateInDays(7);
  else {
    const weekday = title.match(/\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (weekday) {
      const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      dueDate = nextWeekday(names.indexOf(weekday[1].toLowerCase()));
    }
  }

  title = title
    .replace(/^\s*(?:hey\s+)?orbital[,:]?\s*/i, "")
    .replace(/^\s*(?:please\s+)?(?:add|create|make)\s+(?:a\s+)?task\s+(?:to\s+)?/i, "")
    .replace(/^\s*remind me to\s+/i, "")
    .replace(/\b(?:with\s+)?(?:high|medium|low)\s+priority\b/gi, "")
    .replace(/\b(?:urgent|important|someday|whenever)\b/gi, "")
    .replace(/\b(?:due\s+)?(?:today|tonight|tomorrow|next week)\b/gi, "")
    .replace(/\b(?:due\s+)?(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[,.\s]+$/, "")
    .trim();

  if (!title) return null;
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: "",
    dueDate,
    priority,
    ...(teamId ? { teamId } : {}),
  } satisfies Omit<Task, "id" | "createdAt" | "completed">;
}

export function OrbitalAssistant({
  onAdd,
  teamId,
  workspaceName,
}: OrbitalAssistantProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Say a task, priority, and due date.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const timer = window.setTimeout(
      () => setSupported(Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition)),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      recognitionRef.current?.stop();
    };
  }, []);

  function confirm(title: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(`${title} added to ${workspaceName}.`),
    );
  }

  function startListening() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => {
      setListening(true);
      setMessage("Listening… tell Orbital what you need.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const task = parseVoiceTask(transcript, teamId);
      if (!task) {
        setMessage("I heard you, but I need a task name. Please try again.");
        return;
      }
      onAdd(task);
      setMessage(`Added “${task.title}” to ${workspaceName}.`);
      confirm(task.title);
    };
    recognition.onerror = (event) => {
      setMessage(
        event.error === "not-allowed"
          ? "Microphone access is blocked. Allow it in your browser settings."
          : "I couldn’t hear that clearly. Tap the orb and try again.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
  }

  return (
    <section className={`orbital-card ${listening ? "is-listening" : ""}`} aria-labelledby="orbital-title">
      <div className="orbital-copy">
        <div className="section-kicker">
          <span className="section-kicker-dot orbital-dot" aria-hidden="true" />
          AI voice
        </div>
        <h2 id="orbital-title">Orbital</h2>
        <p aria-live="polite">
          {supported === false
            ? "Voice input isn’t supported in this browser. You can still add tasks above."
            : message}
        </p>
        {supported !== false && (
          <small>Try: “Remind me to send the launch email tomorrow, high priority.”</small>
        )}
      </div>
      <motion.button
        type="button"
        className="orbital-mic"
        onClick={startListening}
        disabled={supported === false || listening}
        whileTap={{ scale: 0.94 }}
        aria-label={listening ? "Orbital is listening" : "Ask Orbital to add a task"}
      >
        <span className="orbital-rings" aria-hidden="true" />
        <span aria-hidden="true">{listening ? "◼" : "🎙"}</span>
      </motion.button>
    </section>
  );
}
