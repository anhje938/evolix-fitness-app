import { Dimensions } from "react-native";

export const MODAL_MAX_HEIGHT = Dimensions.get("window").height * 0.90;

export const modalTheme = {
  backdrop: "rgba(2,6,23,0.78)",
  surface: "rgba(2,6,23,0.985)",
  surfaceSoft: "rgba(15,23,42,0.92)",
  surfaceMuted: "rgba(8, 15, 28, 0.41)",
  border: "rgba(103,232,249,0.12)",
  borderSoft: "rgba(255,255,255,0.08)",
  inputBorder: "rgba(148,163,184,0.12)",
  inputFocus: "rgba(34,211,238,0.18)",
  text: "#F8FAFC",
  textStrong: "#E2E8F0",
  muted: "rgba(148,163,184,0.94)",
  label: "rgba(191, 219, 254, 0.93)",
  shadow: "#020617",
  orbTop: "rgba(34,211,238,0.08)",
  orbBottom: "rgba(37,99,235,0.08)",
};

export const modalGradientColors = [
  "rgba(56,189,248,0.22)",
  "rgba(2,132,199,0.12)",
  "rgba(2, 6, 23, 0.36)",
] as const;

export const modalConfirmButtonColors = ['rgba(58,123,213,1)', 'rgba(0,210,255,1)'] as const;