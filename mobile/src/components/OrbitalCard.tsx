import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { OrbitTheme } from "../theme";
import type { Priority, TaskDraft } from "../types";

type OrbitalCardProps = {
  teamId?: string;
  workspaceName: string;
  theme: OrbitTheme;
  onAdd: (draft: TaskDraft) => Promise<unknown>;
};

export function OrbitalCard({
  teamId,
  workspaceName,
  theme,
  onAdd,
}: OrbitalCardProps) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState(
    "Say a task, priority, and due date.",
  );
  const handledRef = useRef(false);

  useSpeechRecognitionEvent("start", () => {
    handledRef.current = false;
    setListening(true);
    setMessage("Listening… tell Orbital what you need.");
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[0];
    if (!result?.transcript) return;
    setMessage(result.transcript);
    if (!event.isFinal || handledRef.current) return;

    handledRef.current = true;
    const task = parseVoiceTask(result.transcript, teamId);
    if (!task) {
      setMessage("I need a task name. Tap the orb and try again.");
      return;
    }

    void onAdd(task)
      .then(() => {
        setMessage(`Added “${task.title}” to ${workspaceName}.`);
        return Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      })
      .catch(() => {
        setMessage("I heard you, but the task could not be saved.");
      });
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setMessage(
      event.error === "not-allowed"
        ? "Allow microphone and speech recognition access in Settings."
        : "I couldn’t hear that clearly. Tap the orb and try again.",
    );
  });

  async function startListening() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setMessage("Microphone access is needed for Orbital.");
      return;
    }

    await Haptics.selectionAsync();
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.panel,
          borderColor: listening ? theme.violet : theme.line,
        },
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.kickerRow}>
          <View style={[styles.kickerDot, { backgroundColor: theme.violet }]} />
          <Text style={[styles.kicker, { color: theme.violet }]}>AI VOICE</Text>
        </View>
        <Text style={[styles.title, { color: theme.ink }]}>Orbital</Text>
        <Text style={[styles.message, { color: theme.muted }]} numberOfLines={3}>
          {message}
        </Text>
        <Text style={[styles.example, { color: theme.faint }]} numberOfLines={2}>
          “Remind me to send the launch email tomorrow, high priority.”
        </Text>
      </View>
      <Pressable
        onPress={startListening}
        accessibilityRole="button"
        accessibilityLabel={
          listening ? "Stop Orbital" : "Ask Orbital to add a task"
        }
        style={({ pressed }) => [
          styles.mic,
          {
            backgroundColor: listening ? theme.coral : theme.violet,
            opacity: pressed ? 0.82 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        {listening ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.micIcon}>✦</Text>
        )}
      </Pressable>
    </View>
  );
}

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

export function parseVoiceTask(
  transcript: string,
  teamId?: string,
): TaskDraft | null {
  let title = transcript.trim();
  let priority: Priority = "medium";
  let dueDate = "";

  if (/\b(high priority|urgent|important)\b/i.test(title)) priority = "high";
  if (/\b(low priority|someday|whenever)\b/i.test(title)) priority = "low";

  if (/\b(today|tonight)\b/i.test(title)) dueDate = localDateInDays(0);
  else if (/\btomorrow\b/i.test(title)) dueDate = localDateInDays(1);
  else if (/\bnext week\b/i.test(title)) dueDate = localDateInDays(7);
  else {
    const weekday = title.match(
      /\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    );
    if (weekday) {
      const names = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      dueDate = nextWeekday(names.indexOf(weekday[1].toLowerCase()));
    }
  }

  title = title
    .replace(/^\s*(?:hey\s+)?orbital[,:]?\s*/i, "")
    .replace(
      /^\s*(?:please\s+)?(?:add|create|make)\s+(?:a\s+)?task\s+(?:to\s+)?/i,
      "",
    )
    .replace(/^\s*remind me to\s+/i, "")
    .replace(/\b(?:with\s+)?(?:high|medium|low)\s+priority\b/gi, "")
    .replace(/\b(?:urgent|important|someday|whenever)\b/gi, "")
    .replace(/\b(?:due\s+)?(?:today|tonight|tomorrow|next week)\b/gi, "")
    .replace(
      /\b(?:due\s+)?(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      "",
    )
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
  };
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kickerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  example: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },
  mic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4931b9",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  micIcon: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
  },
});
