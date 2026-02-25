import { newColors } from "@/config/theme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import CrossIcon from "../../assets/icons/white-cross.svg";

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const SIZE = 40;

const GLASS_BLUE = [
  newColors.primary.main,
  newColors.primary.dark ?? "#1E40AF",
] as const;

export default function AddButton({ setOpen }: Props) {
  return (
    <Pressable onPress={() => setOpen(true)} style={styles.wrapper}>
      <View style={styles.edge}>
        <LinearGradient
          colors={GLASS_BLUE}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 0.9 }}
          style={styles.button}
        >
          {/* glass layer */}
          <View style={styles.glass} />

          {/* highlight */}
          <LinearGradient
            colors={[
              "rgba(255,255,255,0.22)",
              "rgba(255,255,255,0.07)",
              "rgba(255,255,255,0.00)",
            ]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.highlight}
          />

          <CrossIcon width={18} height={18} />
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
  },

  edge: {
    padding: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",

    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  glass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
});
