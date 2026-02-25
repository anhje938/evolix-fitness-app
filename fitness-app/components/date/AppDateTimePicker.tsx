// components/date/AppDateTimePicker.tsx
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { typography } from "@/config/typography";

type AppDateTimePickerProps = {
  label: string;
  mode: "date" | "time";
  value: Date | null;
  onChange: (date: Date | null) => void;
};

export function AppDateTimePicker({
  label,
  mode,
  value,
  onChange,
}: AppDateTimePickerProps) {
  const [show, setShow] = useState(false);

  const currentValue = value ?? new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android: close immediately when user sets or dismisses
    if (event.type === "dismissed") {
      setShow(false);
      return;
    }

    const dateToUse = selectedDate ?? currentValue;
    onChange(dateToUse);
    setShow(false);
  };

  const formattedValue =
    mode === "date"
      ? currentValue.toLocaleDateString("nb-NO")
      : currentValue.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
        });

  return (
    <View style={styles.container}>
      <Text style={[typography.bodyBlack, styles.label]}>{label}</Text>

      {/* Button that opens the native picker */}
      <TouchableOpacity
        style={styles.displayButton}
        onPress={() => setShow(true)}
        activeOpacity={0.8}
      >
        <Text style={[typography.bodyBlack, styles.displayText]}>
          {formattedValue}
        </Text>
      </TouchableOpacity>

      {show &&
        (Platform.OS === "ios" ? (
          // iOS: custom modal with spinner-style picker
          <Modal transparent animationType="fade">
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShow(false)}
                >
                  <Text style={styles.doneButtonText}>Ferdig</Text>
                </TouchableOpacity>
                <DateTimePicker
                  mode={mode}
                  value={currentValue}
                  display="spinner"
                  is24Hour={true}
                  // force light theme so text is dark on light background
                  themeVariant="light"
                  // make sure numbers are visible (not white on white)
                  textColor="black"
                  onChange={(event, selectedDate) => {
                    if (event.type === "dismissed") {
                      setShow(false);
                      return;
                    }
                    const dateToUse = selectedDate ?? currentValue;
                    // live update while user scrolls the wheel
                    onChange(dateToUse);
                  }}
                  style={styles.picker}
                />
              </View>
            </View>
          </Modal>
        ) : (
          // Android: system picker (dialog or inline depending on platform)
          <DateTimePicker
            mode={mode}
            value={currentValue}
            display="default"
            is24Hour={true}
            onChange={handleChange}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 13,
    color: "rgba(148,163,184,0.95)",
    marginBottom: 6,
  },
  displayButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)", // slightly lighter than sheet background
    borderWidth: 1,
    borderColor: "rgba(51,65,85,0.9)", // subtle blue-grey border
    justifyContent: "center",
    alignItems: "center",
  },
  displayText: {
    fontSize: 14,
    color: "#E5ECFF",
    textAlign: "center",
  },

  // iOS modal styling
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingBottom: 24,
    borderRadius: 18,
    alignItems: "center",
    width: "100%",
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#1F2933",
    fontWeight: "500",
  },
  picker: {
    alignSelf: "center",
    minHeight: 200, // ensure the wheel has enough visible space
    width: "100%",
  },
});
