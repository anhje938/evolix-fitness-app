import type { TextStyle } from "react-native";

type TextVariant = "h1" | "h2" | "body" | "bodyBold" | "bodyBlack"  ; // Add new text categories

export const typography: Record<TextVariant, TextStyle> = {
  h1: {
    fontSize: 32,
    fontWeight: "400",
    color: "white",
    fontFamily: "Inter_400Regular"
  },
  h2: {
    fontSize: 18,
    fontWeight: "300",
    color: "white",
    fontFamily: "Inter_400Regular"
  },
  bodyBold: {
    fontSize: 20,
    fontWeight: "500",
    color: "white",
    fontFamily: "Inter_500Regular"
  },
  body: {
    fontSize: 20,
    fontWeight: "300",
    color: "white",
    fontFamily: "Inter_400Regular"
  },
  bodyBlack: {
    fontSize: 15,
    fontWeight: "300",
    color: "#000000",
    fontFamily: "Inter_400Regular"
  }

};
