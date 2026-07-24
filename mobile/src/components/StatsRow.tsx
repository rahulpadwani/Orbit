import { StyleSheet, Text, View } from "react-native";
import type { OrbitTheme } from "../theme";

type StatsRowProps = {
  counts: {
    total: number;
    active: number;
    completed: number;
    high: number;
  };
  theme: OrbitTheme;
};

export function StatsRow({ counts, theme }: StatsRowProps) {
  const items = [
    { label: "Total", value: counts.total, color: theme.violet },
    { label: "Active", value: counts.active, color: theme.mint },
    { label: "Done", value: counts.completed, color: theme.blue },
    { label: "High", value: counts.high, color: theme.coral },
  ];

  return (
    <View style={styles.row} accessibilityLabel="Task summary">
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.card,
            { backgroundColor: theme.panel, borderColor: theme.line },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={[styles.value, { color: theme.ink }]}>{item.value}</Text>
          <Text style={[styles.label, { color: theme.muted }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "800",
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },
});
