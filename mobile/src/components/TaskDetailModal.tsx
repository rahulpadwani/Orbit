import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { OrbitTheme } from "../theme";
import { PRIORITIES, type Priority, type Task } from "../types";

type TaskDetailModalProps = {
  task: Task | null;
  teamName?: string;
  theme: OrbitTheme;
  onClose: () => void;
  onSave: (task: Task) => Promise<unknown>;
  onToggle: (task: Task) => Promise<unknown>;
  onDelete: (task: Task) => Promise<unknown>;
};

export function TaskDetailModal({
  task,
  teamName,
  theme,
  onClose,
  onSave,
  onToggle,
  onDelete,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setShowDate(false);
  }, [task]);

  if (!task) return null;

  const editedTask: Task = {
    ...task,
    title: title.trim() || task.title,
    description: description.trim(),
    priority,
    dueDate,
  };

  async function perform(action: () => Promise<unknown>, close = true) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      if (close) onClose();
    } catch {
      Alert.alert(
        "Orbit could not save that change",
        "Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete this task?",
      "This permanently removes the bubble for everyone who can see it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void perform(() => onDelete(editedTask)),
        },
      ],
    );
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.screen, { backgroundColor: theme.page }]}
      >
        <View style={[styles.handle, { backgroundColor: theme.line }]} />
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: theme.violet }]}>
              {task.completed ? "COMPLETED TASK" : "TASK DETAILS"}
            </Text>
            <Text style={[styles.heading, { color: theme.ink }]}>
              Edit bubble
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close task details"
            style={[styles.close, { backgroundColor: theme.soft }]}
          >
            <Text style={[styles.closeText, { color: theme.ink }]}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: theme.ink }]}>Task title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            style={[
              styles.titleInput,
              {
                backgroundColor: theme.panel,
                borderColor: theme.line,
                color: theme.ink,
              },
            ]}
          />

          <Text style={[styles.label, { color: theme.ink }]}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((item) => {
              const selected = priority === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setPriority(item.value);
                    void Haptics.selectionAsync();
                  }}
                  style={[
                    styles.priority,
                    {
                      backgroundColor: selected ? item.color : theme.panel,
                      borderColor: selected ? item.color : theme.line,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? "#fff" : theme.ink,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.ink }]}>Due date</Text>
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setShowDate((current) => !current)}
              style={[
                styles.dateButton,
                { backgroundColor: theme.panel, borderColor: theme.line },
              ]}
            >
              <Text style={{ color: theme.ink, fontWeight: "700" }}>
                {dueDate ? formatDate(dueDate) : "No due date"}
              </Text>
            </Pressable>
            {dueDate ? (
              <Pressable onPress={() => setDueDate("")} style={styles.clearDate}>
                <Text style={{ color: theme.coral, fontWeight: "800" }}>
                  Clear
                </Text>
              </Pressable>
            ) : null}
          </View>
          {showDate && (
            <View
              style={[
                styles.picker,
                { backgroundColor: theme.panel, borderColor: theme.line },
              ]}
            >
              <DateTimePicker
                value={dueDate ? new Date(`${dueDate}T12:00:00`) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                accentColor={theme.violet}
                onChange={(_, date) => {
                  if (Platform.OS !== "ios") setShowDate(false);
                  if (date) setDueDate(toLocalDate(date));
                }}
              />
            </View>
          )}

          <Text style={[styles.label, { color: theme.ink }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
            placeholder="No description yet"
            placeholderTextColor={theme.faint}
            textAlignVertical="top"
            style={[
              styles.description,
              {
                backgroundColor: theme.panel,
                borderColor: theme.line,
                color: theme.ink,
              },
            ]}
          />

          <View
            style={[
              styles.meta,
              { backgroundColor: theme.soft, borderColor: theme.line },
            ]}
          >
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {teamName ? `Shared in ${teamName}` : "Private task"}
            </Text>
            {task.createdBy && (
              <Text style={[styles.metaText, { color: theme.muted }]}>
                Created by {task.createdBy}
              </Text>
            )}
            <Text style={[styles.metaText, { color: theme.muted }]}>
              Created {formatTimestamp(task.createdAt)}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={() =>
                void perform(() => onToggle(editedTask))
              }
              style={[
                styles.complete,
                {
                  backgroundColor: task.completed ? theme.mint : theme.violet,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.actionText}>
                {task.completed ? "↺ Restore task" : "✓ Mark complete"}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => void perform(() => onSave(editedTask))}
              style={[
                styles.save,
                { backgroundColor: theme.panel, borderColor: theme.line },
              ]}
            >
              <Text style={[styles.saveText, { color: theme.ink }]}>
                Save changes
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={confirmDelete} style={styles.delete}>
            <Text style={[styles.deleteText, { color: theme.coral }]}>
              Delete task
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  heading: { fontSize: 28, fontWeight: "900", marginTop: 3 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 27, lineHeight: 30 },
  content: { padding: 20, paddingBottom: 44 },
  label: { fontSize: 12, fontWeight: "800", marginTop: 20, marginBottom: 8 },
  titleInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 17,
    fontWeight: "700",
  },
  priorityRow: { flexDirection: "row", gap: 9 },
  priority: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  clearDate: { paddingHorizontal: 4, paddingVertical: 10 },
  picker: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
  },
  description: {
    minHeight: 118,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 14,
    gap: 5,
  },
  metaText: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
  actions: { marginTop: 22, gap: 10 },
  complete: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  save: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  saveText: { fontSize: 14, fontWeight: "800" },
  delete: { alignItems: "center", paddingVertical: 18, marginTop: 4 },
  deleteText: { fontSize: 13, fontWeight: "800" },
});
