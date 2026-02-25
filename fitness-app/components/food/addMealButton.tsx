import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import CrossIcon from "../../assets/icons/white-cross.svg";

type AddMealButtonProps = {
  onPress: () => void;
};

const GLASS_BLUE = ["#0284C7", "#1E40AF"] as const;

export function AddMealButton({ onPress }: AddMealButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.wrapper}
      onPress={onPress}
    >
      <View style={styles.edge}>
        <LinearGradient
          colors={GLASS_BLUE}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 0.9 }}
          style={styles.button}
        >
          <View style={styles.glass} />

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

          <CrossIcon height={25} width={25} />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
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
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
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
