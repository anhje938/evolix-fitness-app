import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import XIcon from "../../assets/icons/white-x.svg";
import { AppDateTimePicker } from "../date/AppDateTimePicker";
import { useWeightContext } from "@/context/WeightProvider";

type AddWeightSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  // later this can take a payload object: { weightKg, date, time }
  postWeight: (weightKg: number, timestampUtc: string) => void;
};

const QUICK_ADJUSTS = [-0.5, -0.1, 0.1, 0.5, 1, 2];

export function AddWeightSheet({
  isOpen,
  onClose,
  postWeight,
}: AddWeightSheetProps) {
  const { lastWeight } = useWeightContext();

  const [weightKg, setWeightKg] = useState((lastWeight ?? "").toString());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | null>(new Date());
  const [weightFocused, setWeightFocused] = useState(false);

  if (!isOpen) return null;

  const handleQuickAdjust = (delta: number) => {
    // in the future this should use the last logged weight from backend
    const current = parseFloat(weightKg.replace(",", "."));
    if (isNaN(current)) {
      setWeightKg(delta.toString());
      return;
    }
    const next = +(current + delta).toFixed(1);
    setWeightKg(next.toString());
  };

  const handleSave = () => {
    const value = parseFloat(weightKg.replace(",", "."));
    if (isNaN(value)) {
      // TODO: vis feilmelding
      return;
    }

    const date = selectedDate ?? new Date();
    const time = selectedTime ?? new Date();

    // Lag én Date med dato fra selectedDate og klokkeslett fra selectedTime
    const combined = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      0,
      0
    );

    const timestampUtc = combined.toISOString();

    postWeight(value, timestampUtc);
  };

  return (
    // absolute wrapper so sheet always covers the whole screen
    <View style={styles.absoluteWrapper} pointerEvents="box-none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* Outer overlay: tap here should close the sheet */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={onClose}
        >
          {/* Inner wrapper: prevents taps inside the sheet from closing it */}
          <View pointerEvents="box-none" style={styles.sheetWrapper}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[generalStyles.newCard, styles.sheet]}>
                {/* header */}
                <View style={styles.headerRow}>
                  <Text style={[typography.h2, styles.title]}>Logg vekt</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                  >
                    <XIcon height={18} width={18} />
                  </TouchableOpacity>
                </View>

                {/* weight input */}
                <View style={styles.section}>
                  <Text style={[typography.bodyBlack, styles.label]}>
                    Vekt (kg)
                  </Text>
                  <View
                    style={[
                      styles.inputRow,
                      weightFocused && styles.inputRowFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.weightInput}
                      placeholder="85.0"
                      value={weightKg}
                      onChangeText={setWeightKg}
                      placeholderTextColor="rgba(148,163,184,0.8)"
                      keyboardType="numeric"
                      returnKeyType="done"
                      onBlur={() => setWeightFocused(false)}
                    />
                    <Ionicons
                      name="scale-outline"
                      size={18}
                      color="rgba(148,163,184,0.9)"
                    />
                  </View>
                </View>

                {/* date + time */}
                <View style={[styles.section, styles.row]}>
                  <View style={styles.dateTimeColumn}>
                    <AppDateTimePicker
                      label="Dato"
                      mode="date"
                      value={selectedDate}
                      onChange={setSelectedDate}
                    />
                  </View>
                  <View style={styles.dateTimeColumn}>
                    <AppDateTimePicker
                      label="Tid"
                      mode="time"
                      value={selectedTime}
                      onChange={setSelectedTime}
                    />
                  </View>
                </View>

                {/* quick adjust */}
                <View style={styles.section}>
                  <Text style={[typography.bodyBlack, styles.label]}>
                    Hurtigvalg
                  </Text>

                  <View style={styles.quickRow}>
                    {QUICK_ADJUSTS.slice(0, 3).map((v) => (
                      <TouchableOpacity
                        key={`q1-${v}`}
                        style={styles.quickButton}
                        onPress={() => handleQuickAdjust(v)}
                      >
                        <Text style={styles.quickText}>
                          {v > 0 ? `+${v} kg` : `${v} kg`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.quickRow}>
                    {QUICK_ADJUSTS.slice(3).map((v) => (
                      <TouchableOpacity
                        key={`q2-${v}`}
                        style={styles.quickButton}
                        onPress={() => handleQuickAdjust(v)}
                      >
                        <Text style={styles.quickText}>
                          {v > 0 ? `+${v} kg` : `${v} kg`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* tip card */}
                <View style={styles.tipCard}>
                  <View style={styles.tipIconWrapper}>
                    <Ionicons
                      name="trending-up-outline"
                      size={16}
                      color="#22D3EE"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipTitle}>
                      Tips for nøyaktige målinger
                    </Text>
                    <Text style={styles.tipText}>
                      Vei deg samme tid hver dag, helst om morgenen før frokost.
                      Dette gir de mest konsistente resultatene.
                    </Text>
                  </View>
                </View>

                {/* save button */}
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveWrapper}
                >
                  <LinearGradient
                    colors={["#00C6FF", "#0078FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButton}
                  >
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.saveText}>Lagre vekt</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // makes the sheet independent of page layout
  absoluteWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  // dark overlay behind the card
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.75)",
  },
  // centers the sheet in the middle of the screen
  sheetWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: "rgba(15,23,42,0.98)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  section: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    color: "rgba(148,163,184,0.95)",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
  },
  inputRowFocused: {
    borderColor: "#38BDF8",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  weightInput: {
    flex: 1,
    color: "#E5ECFF",
    fontSize: 16,
    marginRight: 8,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    columnGap: 16,
  },
  dateTimeColumn: {
    flex: 1,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: {
    color: "#E5ECFF",
    fontSize: 13,
    fontWeight: "500",
  },
  tipCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(8,47,73,0.95)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.5)",
  },
  tipIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tipTitle: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "#E5ECFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  tipText: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "rgba(148,163,184,0.95)",
  },
  saveWrapper: {
    marginTop: 22,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
  },
  saveText: {
    ...typography.bodyBlack,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
