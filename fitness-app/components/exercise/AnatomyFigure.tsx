import type { BodyPartObject } from "@/utils/recovery/toBodyHighlighterData";
import React from "react";
import { StyleSheet, View } from "react-native";
import Body from "react-native-body-highlighter";

type Props = {
  side?: "front" | "back";
  gender?: "male" | "female";
  scale?: number;
  outline?: "none" | "subtle";
  offsetY?: number;

  data?: BodyPartObject[]; // <-- NEW
  onBodyPartPress?: (
    bodyPart: { slug?: string; intensity?: number; side?: "left" | "right" },
    side?: "left" | "right"
  ) => void;
};

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function gradientColor(t: number): string {
  // 0 = red, 0.5 = yellow, 1 = green
  const clamped = Math.max(0, Math.min(1, t));
  const red = { r: 220, g: 38, b: 38 };
  const yellow = { r: 250, g: 204, b: 21 };
  const green = { r: 34, g: 197, b: 94 };

  if (clamped <= 0.5) {
    const u = clamped / 0.5;
    return `rgb(${lerp(red.r, yellow.r, u)}, ${lerp(red.g, yellow.g, u)}, ${lerp(
      red.b,
      yellow.b,
      u
    )})`;
  }

  const u = (clamped - 0.5) / 0.5;
  return `rgb(${lerp(yellow.r, green.r, u)}, ${lerp(yellow.g, green.g, u)}, ${lerp(
    yellow.b,
    green.b,
    u
  )})`;
}

const readinessColors = Array.from({ length: 101 }, (_, i) => gradientColor(i / 100));

export default function AnatomyFigure({
  side = "front",
  gender = "male",
  scale = 1.1,
  outline = "none",
  offsetY = 0,
  data = [],
  onBodyPartPress,
}: Props) {
  const BodyAny = Body as unknown as React.ComponentType<any>;

  const defaultFill = "rgba(255,255,255,0.075)";
  const borderProp = outline === "subtle" ? "rgba(255,255,255,0.08)" : "none";

  return (
    <View style={[styles.figureWrap, { transform: [{ translateY: offsetY }] }]}>
      <BodyAny
        data={data}
        colors={readinessColors}
        gender={gender}
        side={side}
        scale={scale}
        border={borderProp}
        defaultFill={defaultFill}
        defaultStroke="none"
        defaultStrokeWidth={0}
        onBodyPartPress={onBodyPartPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  figureWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
});
