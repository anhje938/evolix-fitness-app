import React from "react";
import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { typography } from "@/config/typography";

type Props = {
  title: string;
  height?: number;
  colors?: readonly [string, string] | readonly [string, string, string];
};

export default function GradientHeader({ title, height = 120, colors }: Props) {
  const gradientColors = colors ?? (["#AB38D9", "#D9387E"] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        padding: 10,
        height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={[typography.h1, { marginTop: 25 }]}>{title}</Text>
    </LinearGradient>
  );
}
