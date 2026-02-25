import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type DarkOceanBackgroundProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DarkOceanBackground({
  children,
  style,
}: DarkOceanBackgroundProps) {
  return (
    <LinearGradient
      colors={["#0f172a", "#172554", "#020617"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
