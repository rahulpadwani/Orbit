import type { ColorSchemeName } from "react-native";

export type OrbitTheme = ReturnType<typeof createTheme>;

export function createTheme(scheme: ColorSchemeName) {
  const dark = scheme === "dark";

  return {
    dark,
    page: dark ? "#121019" : "#f3f0f8",
    pageAccent: dark ? "#1b1725" : "#ebe5f5",
    panel: dark ? "#211c2b" : "#fffefe",
    soft: dark ? "#292332" : "#f7f4fa",
    canvas: dark ? "#17131f" : "#fbfaff",
    ink: dark ? "#f6f1fa" : "#211c2e",
    muted: dark ? "#b5acbf" : "#746e82",
    faint: dark ? "#8e8599" : "#9a93a6",
    line: dark ? "rgba(239,226,255,0.14)" : "rgba(54,42,75,0.10)",
    violet: dark ? "#a68bff" : "#7358e8",
    violetDeep: dark ? "#8b6fff" : "#4931b9",
    coral: dark ? "#ff7c8c" : "#ef5b6d",
    mint: dark ? "#4ed9cd" : "#20a59b",
    blue: dark ? "#70b7ff" : "#438fd9",
    shadow: dark ? "#000000" : "#2e2243",
    white: "#ffffff",
  };
}
