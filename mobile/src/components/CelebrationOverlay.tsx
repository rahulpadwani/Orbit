import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { OrbitTheme } from "../theme";

type CelebrationOverlayProps = {
  title: string;
  theme: OrbitTheme;
  onFinished: () => void;
};

const COLORS = ["#ef5b6d", "#7358e8", "#20a59b", "#ffd166", "#438fd9"];

export function CelebrationOverlay({
  title,
  theme,
  onFinished,
}: CelebrationOverlayProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get("window");
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        left: 8 + ((index * 47) % Math.max(1, width - 22)),
        delay: (index % 8) * 38,
        drift: -48 + ((index * 31) % 96),
        color: COLORS[index % COLORS.length],
        rotate: 140 + ((index * 43) % 420),
      })),
    [width],
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(onFinished);
  }, [onFinished, progress]);

  const cardScale = progress.interpolate({
    inputRange: [0, 0.12, 0.28, 0.78, 1],
    outputRange: [0.45, 1.1, 1, 1, 0.9],
  });
  const cardOpacity = progress.interpolate({
    inputRange: [0, 0.1, 0.78, 1],
    outputRange: [0, 1, 1, 0],
  });
  const flashOpacity = progress.interpolate({
    inputRange: [0, 0.08, 0.3, 1],
    outputRange: [0, 0.52, 0.12, 0],
  });

  return (
    <View
      pointerEvents="none"
      style={styles.layer}
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${title} completed. Bubble burst!`}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: theme.violet, opacity: flashOpacity },
        ]}
      />
      {pieces.map((piece, index) => {
        const local = progress.interpolate({
          inputRange: [
            Math.min(piece.delay / 1900, 0.35),
            Math.min(piece.delay / 1900 + 0.02, 0.37),
            1,
          ],
          outputRange: [0, 0, 1],
        });
        const translateY = local.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height + 60],
        });
        const translateX = local.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.drift],
        });
        const rotate = local.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${piece.rotate}deg`],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left: piece.left,
                backgroundColor: piece.color,
                opacity: progress.interpolate({
                  inputRange: [0, 0.08, 0.88, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.panel,
              borderColor: theme.line,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={[styles.check, { backgroundColor: theme.mint }]}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={[styles.heading, { color: theme.ink }]}>
            Bubble burst!
          </Text>
          <Text style={[styles.body, { color: theme.muted }]} numberOfLines={2}>
            {title} is complete
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    inset: 0,
  },
  layer: {
    position: "absolute",
    inset: 0,
    zIndex: 50,
    overflow: "hidden",
  },
  confetti: {
    position: "absolute",
    top: -24,
    width: 8,
    height: 16,
    borderRadius: 3,
  },
  center: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
  },
  check: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  checkText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  heading: {
    fontSize: 24,
    fontWeight: "900",
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
