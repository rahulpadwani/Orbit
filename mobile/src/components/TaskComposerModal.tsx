import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { PRIORITIES, type Priority, type TaskDraft, type Team } from "../types";

type TaskComposerModalProps = {
  visible: boolean;
  teams: Team[];
  defaultTeamId?: string;
  theme: OrbitTheme;
  onClose: () => void;
  onSubmit: (draft: TaskDraft) => Promise<unknown>;
};

export function TaskComposerModal({
  visible,
  teams,
  defaultTeamId,
  theme,
  onClose,
  onSubmit,
}: TaskComposerModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [teamId, setTeamId] = useState<string | undefined>(defaultTeamId);
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setDescription("");
    setPriority("medium");
    setTeamId(defaultTeamId);
    setDueDate("");
    setShowDate(false);
  }, [defaultTeamId, visible]);

  async function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        title: cleanTitle,
        description: description.trim(),
        dueDate,
        priority,
        ...(teamId ? { teamId } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      Alert.alert(
        "Bubble not launched",
        "Orbit could not save this task. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
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
              NEW BUBBLE
            </Text>
            <Text style={[styles.heading, { color: theme.ink }]}>
              Add a task
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close task composer"
            style={[styles.close, { backgroundColor: theme.soft }]}
          >
            <Text style={[styles.closeText, { color: theme.ink }]}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <FieldLabel label="Task title" theme={theme} />
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="What needs your attention?"
            placeholderTextColor={theme.faint}
            maxLength={120}
            returnKeyType="next"
            style={[
              styles.titleInput,
              {
                backgroundColor: theme.panel,
                borderColor: theme.line,
                color: theme.ink,
              },
            ]}
          />

          <FieldLabel label="Priority" theme={theme} />
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
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[
                    styles.priority,
                    {
                      backgroundColor: selected ? item.color : theme.panel,
                      borderColor: selected ? item.color : theme.line,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: selected ? "#fff" : theme.ink },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FieldLabel label="Workspace" theme={theme} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <WorkspaceChip
              label="My space"
              selected={!teamId}
              onPress={() => setTeamId(undefined)}
              theme={theme}
            />
            {teams.map((team) => (
              <WorkspaceChip
                key={team.id}
                label={team.name}
                selected={teamId === team.id}
                onPress={() => setTeamId(team.id)}
                theme={theme}
              />
            ))}
          </ScrollView>

          <FieldLabel label="Due date" theme={theme} />
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setShowDate((current) => !current)}
              style={[
                styles.dateButton,
                { backgroundColor: theme.panel, borderColor: theme.line },
              ]}
            >
              <Text style={[styles.dateButtonText, { color: theme.ink }]}>
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
                minimumDate={new Date()}
                accentColor={theme.violet}
                onChange={(_, date) => {
                  if (Platform.OS !== "ios") setShowDate(false);
                  if (date) setDueDate(toLocalDate(date));
                }}
              />
            </View>
          )}

          <FieldLabel label="Short description" optional theme={theme} />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add a little context"
            placeholderTextColor={theme.faint}
            maxLength={500}
            multiline
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

          <Pressable
            onPress={submit}
            disabled={!title.trim() || saving}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: theme.violet,
                opacity: !title.trim() || saving ? 0.46 : pressed ? 0.82 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Launch bubble</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldLabel({
  label,
  optional,
  theme,
}: {
  label: string;
  optional?: boolean;
  theme: OrbitTheme;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>
      {optional && (
        <Text style={[styles.optional, { color: theme.faint }]}>Optional</Text>
      )}
    </View>
  );
}

function WorkspaceChip({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: OrbitTheme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.violet : theme.panel,
          borderColor: selected ? theme.violet : theme.line,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? "#fff" : theme.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 27,
    lineHeight: 30,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
  },
  optional: {
    fontSize: 10,
    fontWeight: "700",
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 17,
    fontWeight: "700",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 9,
  },
  priority: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "800",
  },
  chips: {
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  clearDate: {
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
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
  submit: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
