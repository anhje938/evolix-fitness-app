import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "@/i18n/translations";

export const GLOBAL_IOS_KEYBOARD_ACCESSORY_ID = "global-ios-keyboard-accessory";

export function GlobalKeyboardAccessory() {
  const { language } = useTranslation();
  if (Platform.OS !== "ios") return null;
  const doneLabel = language === "en" ? "Done" : "Ferdig";

  const handleDone = () => {
    const textInputState = (TextInput as typeof TextInput & {
      State?: {
        currentlyFocusedInput?: () => unknown;
      };
    }).State;

    const focused = textInputState?.currentlyFocusedInput?.() as
      | { blur?: () => void }
      | undefined;

    focused?.blur?.();
    Keyboard.dismiss();
  };

  return (
    <InputAccessoryView nativeID={GLOBAL_IOS_KEYBOARD_ACCESSORY_ID}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={handleDone}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={doneLabel}
        >
          <LinearGradient
            colors={["#0891B2", "#22D3EE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.doneButton}
          >
            <Ionicons name="checkmark" size={15} color="#ECFEFF" />
            <Text style={styles.doneText}>{doneLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(56,189,248,0.36)",
    backgroundColor: "rgba(11,30,52,0.98)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  doneText: {
    color: "#ECFEFF",
    fontSize: 13,
    fontWeight: "500",
  },
});
