// components/date/AppDateTimePicker.tsx
import React, { useState } from "react";
import { formatDate, formatTime } from "@/utils/date";
import {
  Keyboard,
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
import { useTranslation } from "@/i18n/translations";

type AppDateTimePickerProps = {
  label: string;
  mode: "date" | "time";
  value: Date | null;
  onChange: (date: Date | null) => void;
  compact?: boolean;
};

export function AppDateTimePicker({
  label,
  mode,
  value,
  onChange,
  compact = false,
}: AppDateTimePickerProps) {
  const { language } = useTranslation();
  const [show, setShow] = useState(false);
  const [draftValue, setDraftValue] = useState<Date | null>(null);

  const currentValue = value ?? new Date();
  const pickerValue = draftValue ?? currentValue;

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android: close immediately when user sets or dismisses
    if (event.type === "dismissed") {
      setDraftValue(null);
      setShow(false);
      return;
    }

    const dateToUse = selectedDate ?? currentValue;
    onChange(dateToUse);
    setDraftValue(null);
    setShow(false);
  };

  const formattedValue =
    mode === "date"
      ? formatDate(currentValue, language)
      : formatTime(currentValue, language);

  const openPicker = () => {
    Keyboard.dismiss();
    setDraftValue(currentValue);
    requestAnimationFrame(() => {
      setShow(true);
    });
  };

  const handleDone = () => {
    onChange(pickerValue);
    setDraftValue(null);
    setShow(false);
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          typography.bodyBlack,
          styles.label,
          compact && styles.labelCompact,
        ]}
      >
        {label}
      </Text>

      {/* Button that opens the native picker */}
      <TouchableOpacity
        style={[styles.displayButton, compact && styles.displayButtonCompact]}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <Text
          style={[
            typography.bodyBlack,
            styles.displayText,
            compact && styles.displayTextCompact,
          ]}
        >
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
                  onPress={handleDone}
                >
                  <Text style={styles.doneButtonText}>
                    {language === "en" ? "Done" : "Ferdig"}
                  </Text>
                </TouchableOpacity>
                <DateTimePicker
                  mode={mode}
                  value={pickerValue}
                  display="spinner"
                  is24Hour={true}
                  // force light theme so text is dark on light background
                  themeVariant="light"
                  // make sure numbers are visible (not white on white)
                  textColor="black"
                  onChange={(event, selectedDate) => {
                    if (event.type === "dismissed") {
                      setDraftValue(null);
                      setShow(false);
                      return;
                    }
                    setDraftValue(selectedDate ?? pickerValue);
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
  labelCompact: {
    fontSize: 11,
    marginBottom: 3,
    color: "rgba(148,163,184,0.88)",
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
  displayButtonCompact: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  displayText: {
    fontSize: 14,
    color: "#E5ECFF",
    textAlign: "center",
  },
  displayTextCompact: {
    fontSize: 12.5,
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
