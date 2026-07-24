import { UserButton } from "@clerk/expo/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BubbleBoard } from "../components/BubbleBoard";
import { CelebrationOverlay } from "../components/CelebrationOverlay";
import { OrbitalCard } from "../components/OrbitalCard";
import { StatsRow } from "../components/StatsRow";
import { TaskComposerModal } from "../components/TaskComposerModal";
import { TaskDetailModal } from "../components/TaskDetailModal";
import { TeamsModal } from "../components/TeamsModal";
import { useOrbitData } from "../hooks/useOrbitData";
import { createTheme } from "../theme";
import type { Task, TaskFilter, WorkspaceId } from "../types";

const FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "completed", label: "Done" },
];

export function OrbitHome() {
  const scheme = useColorScheme();
  const theme = createTheme(scheme);
  const orbit = useOrbitData();
  const [workspace, setWorkspace] = useState<WorkspaceId>("all");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  const selectedTask =
    orbit.tasks.find((task) => task.id === selectedId) ?? null;
  const selectedTeam = orbit.teams.find(
    (team) => team.id === selectedTask?.teamId,
  );
  const targetTeam = orbit.teams.find((team) => team.id === workspace);

  const visibleTasks = useMemo(() => {
    const scoped =
      workspace === "all"
        ? orbit.tasks
        : workspace === "personal"
          ? orbit.tasks.filter((task) => !task.teamId)
          : orbit.tasks.filter((task) => task.teamId === workspace);

    if (filter === "completed") {
      return scoped.filter((task) => task.completed);
    }

    return scoped.filter(
      (task) =>
        !task.completed && (filter === "all" || task.priority === filter),
    );
  }, [filter, orbit.tasks, workspace]);

  const workspaceName =
    workspace === "all"
      ? "All workspaces"
      : workspace === "personal"
        ? "My space"
        : targetTeam?.name ?? "Team orbit";

  async function completeTask(task: Task) {
    setSelectedId(null);
    await orbit.toggleTask(task);
    if (!task.completed) {
      setCelebration(task.title);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } else {
      setFilter("all");
      await Haptics.selectionAsync();
    }
  }

  if (focusMode) {
    return (
      <SafeAreaView
        style={[styles.focusScreen, { backgroundColor: theme.page }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.focusHeader}>
          <View>
            <Text style={[styles.liveKicker, { color: theme.mint }]}>
              PRESENTATION MODE
            </Text>
            <Text style={[styles.focusTitle, { color: theme.ink }]}>
              {workspaceName}
            </Text>
          </View>
          <Pressable
            onPress={() => setFocusMode(false)}
            style={[styles.exitFocus, { backgroundColor: theme.panel }]}
          >
            <Text style={[styles.exitFocusText, { color: theme.ink }]}>
              Exit
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.focusContent}>
          <BubbleBoard
            tasks={visibleTasks}
            filter={filter}
            theme={theme}
            onSelect={(task) => setSelectedId(task.id)}
            onComplete={completeTask}
          />
        </ScrollView>
        <TaskDetailModal
          task={selectedTask}
          teamName={selectedTeam?.name}
          theme={theme}
          onClose={() => setSelectedId(null)}
          onSave={orbit.saveTask}
          onToggle={completeTask}
          onDelete={orbit.deleteTask}
        />
        {celebration && (
          <CelebrationOverlay
            title={celebration}
            theme={theme}
            onFinished={() => setCelebration(null)}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.page }]}
      edges={["top"]}
    >
      <LinearGradient
        colors={
          theme.dark
            ? ["#121019", "#1b1725"]
            : ["#f3f0f8", "#ebe5f5"]
        }
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orbit.refreshing}
            onRefresh={orbit.refresh}
            tintColor={theme.violet}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark />
            <View>
              <Text style={[styles.brand, { color: theme.ink }]}>Orbit</Text>
              <Text style={[styles.tagline, { color: theme.muted }]}>
                Make space for what matters.
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setFocusMode(true)}
              accessibilityRole="button"
              accessibilityLabel="Open presentation mode"
              style={[styles.focusButton, { backgroundColor: theme.panel }]}
            >
              <Text style={[styles.focusButtonText, { color: theme.violet }]}>
                Focus
              </Text>
            </Pressable>
            <View style={styles.userButton}>
              <UserButton />
            </View>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.greeting, { color: theme.ink }]}>
            Hello, {orbit.displayName}
          </Text>
          <View
            style={[
              styles.syncPill,
              {
                backgroundColor:
                  orbit.syncState === "offline"
                    ? `${theme.coral}20`
                    : `${theme.mint}1f`,
              },
            ]}
          >
            <View
              style={[
                styles.syncDot,
                {
                  backgroundColor:
                    orbit.syncState === "offline" ? theme.coral : theme.mint,
                },
              ]}
            />
            <Text
              style={[
                styles.syncText,
                {
                  color:
                    orbit.syncState === "offline" ? theme.coral : theme.mint,
                },
              ]}
            >
              {orbit.syncState === "connecting"
                ? "Connecting"
                : orbit.syncState === "synced"
                  ? "Cloud synced"
                  : "Offline"}
            </Text>
          </View>
        </View>

        <StatsRow counts={orbit.counts} theme={theme} />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionKicker, { color: theme.violet }]}>
              WORKSPACE
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>
              {workspaceName}
            </Text>
          </View>
          <Pressable
            onPress={() => setTeamsOpen(true)}
            style={[
              styles.teamsButton,
              { backgroundColor: theme.panel, borderColor: theme.line },
            ]}
          >
            <Text style={[styles.teamsButtonText, { color: theme.violet }]}>
              Teams
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.workspaceChips}
        >
          <WorkspaceChip
            label="All"
            selected={workspace === "all"}
            theme={theme}
            onPress={() => setWorkspace("all")}
          />
          <WorkspaceChip
            label="My space"
            selected={workspace === "personal"}
            theme={theme}
            onPress={() => setWorkspace("personal")}
          />
          {orbit.teams.map((team) => (
            <WorkspaceChip
              key={team.id}
              label={team.name}
              selected={workspace === team.id}
              theme={theme}
              onPress={() => setWorkspace(team.id)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setFilter(item.value);
                  void Haptics.selectionAsync();
                }}
                style={[
                  styles.filter,
                  {
                    backgroundColor: selected ? theme.violet : theme.panel,
                    borderColor: selected ? theme.violet : theme.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: selected ? "#fff" : theme.ink },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <OrbitalCard
          teamId={targetTeam?.id}
          workspaceName={targetTeam?.name ?? "My space"}
          theme={theme}
          onAdd={orbit.addTask}
        />

        <View style={styles.orbitHeading}>
          <View>
            <Text style={[styles.liveKicker, { color: theme.mint }]}>
              LIVE FOCUS SPACE
            </Text>
            <Text style={[styles.orbitTitle, { color: theme.ink }]}>
              {filter === "completed" ? "Completed bubbles" : "Your orbit"}
            </Text>
          </View>
          <Text style={[styles.taskCount, { color: theme.muted }]}>
            {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
          </Text>
        </View>

        {orbit.loading && orbit.tasks.length === 0 ? (
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: theme.canvas, borderColor: theme.line },
            ]}
          >
            <ActivityIndicator color={theme.violet} size="large" />
            <Text style={[styles.loadingText, { color: theme.muted }]}>
              Pulling your bubbles into view…
            </Text>
          </View>
        ) : (
          <BubbleBoard
            tasks={visibleTasks}
            filter={filter}
            theme={theme}
            onSelect={(task) => setSelectedId(task.id)}
            onComplete={completeTask}
          />
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Pressable
        onPress={() => setComposerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add a task"
        style={({ pressed }) => [
          styles.addButton,
          {
            backgroundColor: theme.violet,
            opacity: pressed ? 0.86 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Text style={styles.addIcon}>＋</Text>
      </Pressable>

      {orbit.notice ? (
        <Pressable
          onPress={() => orbit.setNotice("")}
          style={[
            styles.toast,
            { backgroundColor: theme.ink, shadowColor: theme.shadow },
          ]}
        >
          <Text style={[styles.toastText, { color: theme.page }]}>
            {orbit.notice}
          </Text>
        </Pressable>
      ) : null}

      <TaskComposerModal
        visible={composerOpen}
        teams={orbit.teams}
        defaultTeamId={targetTeam?.id}
        theme={theme}
        onClose={() => setComposerOpen(false)}
        onSubmit={orbit.addTask}
      />
      <TaskDetailModal
        task={selectedTask}
        teamName={selectedTeam?.name}
        theme={theme}
        onClose={() => setSelectedId(null)}
        onSave={orbit.saveTask}
        onToggle={completeTask}
        onDelete={orbit.deleteTask}
      />
      <TeamsModal
        visible={teamsOpen}
        teams={orbit.teams}
        theme={theme}
        onClose={() => setTeamsOpen(false)}
        onCreate={async (name) => {
          const team = await orbit.createTeam(name);
          setWorkspace(team.id);
          return team;
        }}
        onInvite={orbit.createInvite}
      />

      {celebration && (
        <CelebrationOverlay
          title={celebration}
          theme={theme}
          onFinished={() => setCelebration(null)}
        />
      )}
    </SafeAreaView>
  );
}

function WorkspaceChip({
  label,
  selected,
  theme,
  onPress,
}: {
  label: string;
  selected: boolean;
  theme: ReturnType<typeof createTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.workspaceChip,
        {
          backgroundColor: selected ? theme.violet : theme.panel,
          borderColor: selected ? theme.violet : theme.line,
        },
      ]}
    >
      <Text
        style={[
          styles.workspaceChipText,
          { color: selected ? "#fff" : theme.ink },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BrandMark() {
  return (
    <View style={styles.brandMark} accessibilityElementsHidden>
      <View style={[styles.brandOrb, styles.brandOrbOne]} />
      <View style={[styles.brandOrb, styles.brandOrbTwo]} />
      <View style={[styles.brandOrb, styles.brandOrbThree]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 46, height: 46 },
  brandOrb: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#4931b9",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  brandOrbOne: {
    width: 29,
    height: 29,
    borderRadius: 15,
    left: 2,
    top: 2,
    backgroundColor: "#7358e8",
  },
  brandOrbTwo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    right: 0,
    bottom: 1,
    backgroundColor: "#20a59b",
  },
  brandOrbThree: {
    width: 16,
    height: 16,
    borderRadius: 8,
    right: 1,
    top: 1,
    backgroundColor: "#ef5b6d",
  },
  brand: { fontSize: 19, fontWeight: "900" },
  tagline: { fontSize: 10, marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  focusButton: {
    height: 38,
    borderRadius: 14,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  focusButtonText: { fontSize: 11, fontWeight: "900" },
  userButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { fontSize: 14, fontWeight: "800", flex: 1 },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 10, fontWeight: "900" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 3,
  },
  sectionKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  sectionTitle: { fontSize: 23, fontWeight: "900", marginTop: 2 },
  teamsButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  teamsButtonText: { fontSize: 11, fontWeight: "900" },
  workspaceChips: { gap: 8, paddingRight: 16 },
  workspaceChip: {
    maxWidth: 160,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  workspaceChipText: { fontSize: 11, fontWeight: "800" },
  filters: { gap: 8, paddingRight: 16 },
  filter: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterText: { fontSize: 11, fontWeight: "800" },
  orbitHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 3,
  },
  liveKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  orbitTitle: { fontSize: 25, fontWeight: "900", marginTop: 2 },
  taskCount: { fontSize: 11, fontWeight: "700", paddingBottom: 4 },
  loadingCard: {
    minHeight: 360,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 12, fontWeight: "700" },
  bottomSpace: { height: 96 },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4931b9",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  addIcon: { color: "#fff", fontSize: 32, lineHeight: 36, fontWeight: "500" },
  toast: {
    position: "absolute",
    left: 18,
    right: 92,
    bottom: 30,
    minHeight: 50,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
  },
  toastText: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  focusScreen: { flex: 1, paddingHorizontal: 14 },
  focusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  focusTitle: { fontSize: 26, fontWeight: "900", marginTop: 2 },
  exitFocus: {
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  exitFocusText: { fontSize: 12, fontWeight: "900" },
  focusContent: { paddingBottom: 18 },
});
