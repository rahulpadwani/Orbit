import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { OrbitTheme } from "../theme";
import type { Task, TaskFilter } from "../types";

type BubbleBoardProps = {
  tasks: Task[];
  filter: TaskFilter;
  theme: OrbitTheme;
  onSelect: (task: Task) => void;
  onComplete: (task: Task) => Promise<unknown>;
};

const SIZE = {
  high: 136,
  medium: 112,
  low: 92,
} as const;

const COLORS = {
  high: ["#ff8797", "#ef5b6d", "#b73554"],
  medium: ["#a894ff", "#7358e8", "#4931b9"],
  low: ["#65ddd4", "#20a59b", "#117970"],
} as const;

export function BubbleBoard({
  tasks,
  filter,
  theme,
  onSelect,
  onComplete,
}: BubbleBoardProps) {
  if (tasks.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          { backgroundColor: theme.canvas, borderColor: theme.line },
        ]}
      >
        <Text style={styles.emptyOrb}>○</Text>
        <Text style={[styles.emptyTitle, { color: theme.ink }]}>
          {filter === "completed"
            ? "Nothing completed yet"
            : "Your orbit is clear"}
        </Text>
        <Text style={[styles.emptyBody, { color: theme.muted }]}>
          {filter === "completed"
            ? "Finish a task and its bubble will land here."
            : "Add a task or ask Orbital to create one."}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.board,
        { backgroundColor: theme.canvas, borderColor: theme.line },
      ]}
    >
      <View style={styles.hintRow}>
        <Text style={[styles.hint, { color: theme.muted }]}>
          Tap to open · hold to complete
        </Text>
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: theme.mint }]} />
          <Text style={[styles.liveText, { color: theme.muted }]}>LIVE</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {tasks.map((task, index) => (
          <FloatingBubble
            key={task.id}
            task={task}
            index={index}
            theme={theme}
            onSelect={onSelect}
            onComplete={onComplete}
          />
        ))}
      </View>
    </View>
  );
}

type FloatingBubbleProps = {
  task: Task;
  index: number;
  theme: OrbitTheme;
  onSelect: (task: Task) => void;
  onComplete: (task: Task) => Promise<unknown>;
};

function FloatingBubble({
  task,
  index,
  theme,
  onSelect,
  onComplete,
}: FloatingBubbleProps) {
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const size = SIZE[task.priority];
  const duration = useMemo(() => 1900 + ((index * 431) % 1100), [index]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(driftX, {
            toValue: index % 2 === 0 ? 8 : -8,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(driftX, {
            toValue: index % 2 === 0 ? -7 : 7,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(driftX, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(driftY, {
            toValue: -10,
            duration: duration * 0.72,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(driftY, {
            toValue: 8,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(driftY, {
            toValue: 0,
            duration: duration * 0.55,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [driftX, driftY, duration, index]);

  function pressIn() {
    Animated.spring(pressScale, {
      toValue: 0.96,
      speed: 28,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.spring(pressScale, {
      toValue: 1,
      speed: 26,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  }

  async function longPress() {
    if (task.completed) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 1.16,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(pressScale, {
        toValue: 0.12,
        duration: 240,
        easing: Easing.in(Easing.back(1.8)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      void onComplete(task).catch(() => {
        Animated.spring(pressScale, {
          toValue: 1,
          speed: 24,
          bounciness: 10,
          useNativeDriver: true,
        }).start();
      });
    });
  }

  return (
    <View style={styles.cell}>
      <Animated.View
        style={{
          transform: [
            { translateX: driftX },
            { translateY: driftY },
            { scale: pressScale },
          ],
        }}
      >
        <Pressable
          onPress={() => onSelect(task)}
          onLongPress={longPress}
          delayLongPress={650}
          onPressIn={pressIn}
          onPressOut={pressOut}
          accessibilityRole="button"
          accessibilityLabel={`${task.title}, ${task.priority} priority${
            task.completed ? ", completed" : ""
          }`}
          accessibilityHint={
            task.completed
              ? "Opens task details."
              : "Tap for details or hold to mark complete."
          }
        >
          <LinearGradient
            colors={COLORS[task.priority]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[
              styles.bubble,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: task.completed ? 0.72 : 1,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={styles.glow} />
            {task.completed && <Text style={styles.check}>✓</Text>}
            <Text
              style={[
                styles.title,
                { fontSize: task.priority === "low" ? 12 : 14 },
              ]}
              numberOfLines={3}
            >
              {task.title}
            </Text>
            {task.createdBy && (
              <Text style={styles.creator} numberOfLines={1}>
                {task.createdBy}
              </Text>
            )}
            <Text style={styles.priority}>
              {task.completed ? "Completed" : task.priority.toUpperCase()}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    minHeight: 380,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "50%",
    height: 164,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.38)",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  glow: {
    position: "absolute",
    top: "10%",
    left: "18%",
    width: "44%",
    height: "22%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ rotate: "-18deg" }],
  },
  check: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 2,
  },
  title: {
    color: "#fff",
    fontWeight: "800",
    lineHeight: 17,
    textAlign: "center",
    textShadowColor: "rgba(34,20,65,0.28)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  creator: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
    maxWidth: "92%",
  },
  priority: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginTop: 5,
  },
  empty: {
    minHeight: 360,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emptyOrb: {
    color: "#7358e8",
    fontSize: 58,
    lineHeight: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },
});
