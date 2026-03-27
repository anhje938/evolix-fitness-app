import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useWeightContext } from "@/context/WeightProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import XIcon from "../../assets/icons/white-x.svg";
import { AppDateTimePicker } from "../date/AppDateTimePicker";

type AddWeightSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  postWeight: (weightKg: number, timestampUtc: string) => void | Promise<void>;
};

const QUICK_ADJUSTS = [-0.5, -0.1, 0.1, 0.5, 1, 2];
const SHEET_TOP_MARGIN = 108;
const SHEET_BOTTOM_MARGIN = 40;
const SHEET_HEIGHT =
  Dimensions.get("window").height - SHEET_TOP_MARGIN - SHEET_BOTTOM_MARGIN;
const ENTER_DURATION = 220;
const EXIT_DURATION = 170;

function formatWeightValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`;
}

export function AddWeightSheet({
  isOpen,
  onClose,
  postWeight,
}: AddWeightSheetProps) {
  const { lastWeight } = useWeightContext();
  const isClosingRef = useRef(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(28)).current;
  const sheetScale = useRef(new Animated.Value(0.985)).current;

  const [weightKg, setWeightKg] = useState(() => (lastWeight ?? "").toString());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date()
  );
  const [selectedTime, setSelectedTime] = useState<Date | null>(
    () => new Date()
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 20,
        mass: 0.95,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetScale, {
        toValue: 1,
        damping: 18,
        mass: 0.9,
        stiffness: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, isOpen, sheetOpacity, sheetScale, sheetTranslateY]);

  if (!isOpen) return null;

  const hasLastWeight =
    typeof lastWeight === "number" && Number.isFinite(lastWeight);
  const parsedWeight = Number.parseFloat(weightKg.replace(",", "."));
  const deltaFromLast =
    hasLastWeight && Number.isFinite(parsedWeight)
      ? +(parsedWeight - lastWeight).toFixed(1)
      : null;
  const weightPlaceholder = hasLastWeight ? lastWeight.toFixed(1) : "85.0";

  const handleRequestClose = () => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    Keyboard.dismiss();

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 24,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetScale, {
        toValue: 0.985,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      onClose();
    });
  };

  const handleQuickAdjust = (delta: number) => {
    const current = Number.parseFloat(weightKg.replace(",", "."));
    const baseValue = Number.isFinite(current)
      ? current
      : hasLastWeight
        ? lastWeight
        : 0;
    const next = +(baseValue + delta).toFixed(1);

    if (next <= 0) return;
    setWeightKg(formatWeightValue(next));
  };

  const handleSave = async () => {
    if (isSaving) return;

    const value = Number.parseFloat(weightKg.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Ugyldig vekt", "Skriv inn en gyldig vekt i kg.");
      return;
    }

    const date = selectedDate ?? new Date();
    const time = selectedTime ?? new Date();
    const combined = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      0,
      0
    );

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      await Promise.resolve(postWeight(value, combined.toISOString()));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.keyboardRoot}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Lukk logg vekt"
          />
        </Animated.View>

        <View style={styles.sheetFrame} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheetAnimationWrap,
              {
                opacity: sheetOpacity,
                transform: [
                  { translateY: sheetTranslateY },
                  { scale: sheetScale },
                ],
              },
            ]}
          >
            <View style={[generalStyles.newCard, styles.sheet]}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(56,189,248,0.22)",
                  "rgba(2,132,199,0.12)",
                  "rgba(2,6,23,0)",
                ]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.95, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.orbTop} />
              <View pointerEvents="none" style={styles.orbBottom} />

              <View style={styles.sheetContent}>
                <View style={styles.contentLayout}>
                  <View style={styles.mainStack}>
                    <View style={styles.headerRow}>
                      <View style={styles.headerCopy}>
                        <Text style={[typography.h2, styles.title]}>
                          Logg vekt
                        </Text>
                        <Text style={[typography.bodyBlack, styles.subtitle]}>
                          Rask, stabil og presis logging med ren historikk.
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={handleRequestClose}
                        style={styles.closeButton}
                        activeOpacity={0.82}
                      >
                        <XIcon height={18} width={18} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.sectionCard}>
                      <View style={styles.labelRow}>
                        <Text style={[typography.bodyBlack, styles.label]}>
                          Vekt (kg)
                        </Text>

                        {deltaFromLast !== null && (
                          <View
                            style={[
                              styles.deltaChip,
                              deltaFromLast <= 0
                                ? styles.deltaChipDown
                                : styles.deltaChipUp,
                            ]}
                          >
                            <Ionicons
                              name={
                                deltaFromLast <= 0
                                  ? "trending-down-outline"
                                  : "trending-up-outline"
                              }
                              size={12}
                              color={deltaFromLast <= 0 ? "#99F6E4" : "#BFDBFE"}
                            />
                            <Text style={styles.deltaChipText}>
                              {formatDelta(deltaFromLast)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.inputShell}>
                        <TextInput
                          style={styles.weightInput}
                          placeholder={weightPlaceholder}
                          value={weightKg}
                          onChangeText={setWeightKg}
                          placeholderTextColor="rgba(148,163,184,0.72)"
                          keyboardType={
                            Platform.OS === "ios" ? "decimal-pad" : "numeric"
                          }
                          returnKeyType="done"
                          blurOnSubmit
                          onSubmitEditing={() => {
                            Keyboard.dismiss();
                          }}
                          autoCorrect={false}
                          autoCapitalize="none"
                        />

                        <View style={styles.inputIconShell}>
                          <Ionicons
                            name="scale-outline"
                            size={18}
                            color="rgba(148,163,184,0.96)"
                            pointerEvents="none"
                          />
                        </View>
                      </View>
                    </View>

                    <View style={[styles.sectionCard, styles.dateCard]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[typography.bodyBlack, styles.label]}>
                          Tidspunkt
                        </Text>
                      </View>

                      <View style={styles.dateRow}>
                        <View style={styles.dateTimeColumn}>
                          <AppDateTimePicker
                            label="Dato"
                            mode="date"
                            value={selectedDate}
                            onChange={setSelectedDate}
                            compact
                          />
                        </View>

                        <View style={styles.dateTimeColumn}>
                          <AppDateTimePicker
                            label="Tid"
                            mode="time"
                            value={selectedTime}
                            onChange={setSelectedTime}
                            compact
                          />
                        </View>
                      </View>
                    </View>

                    <View style={[styles.sectionCard, styles.quickCard]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[typography.bodyBlack, styles.label]}>
                          Hurtigvalg
                        </Text>
                      </View>

                      <View style={styles.quickGrid}>
                        {QUICK_ADJUSTS.map((value) => (
                          <TouchableOpacity
                            key={value}
                            style={styles.quickButton}
                            onPress={() => handleQuickAdjust(value)}
                            activeOpacity={0.86}
                          >
                            <LinearGradient
                              pointerEvents="none"
                              colors={[
                                "rgba(255,255,255,0.08)",
                                "rgba(255,255,255,0.02)",
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFill}
                            />
                            <Text style={styles.quickText}>
                              {value > 0 ? `+${value}` : value} kg
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.tipCard}>
                      <View style={styles.tipIconWrapper}>
                        <Ionicons
                          name="sparkles-outline"
                          size={15}
                          color="#67E8F9"
                        />
                      </View>

                      <View style={styles.tipCopy}>
                        <Text style={styles.tipTitle}>Renere data</Text>
                        <Text style={styles.tipText}>
                          Målinger på samme tidspunkt gir roligere trendlinjer og
                          bedre sammenligning fra uke til uke.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.footerBlock}>
                    <TouchableOpacity
                      onPress={() => {
                        void handleSave();
                      }}
                      style={styles.saveWrapper}
                      activeOpacity={0.9}
                      disabled={isSaving}
                    >
                      <LinearGradient
                        colors={
                          isSaving
                            ? ["#1D4ED8", "#2563EB"]
                            : ["#06B6D4", "#2563EB"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.saveButton}
                      >
                        <LinearGradient
                          pointerEvents="none"
                          colors={[
                            "rgba(255,255,255,0.2)",
                            "rgba(255,255,255,0.03)",
                            "rgba(255,255,255,0)",
                          ]}
                          start={{ x: 0.15, y: 0 }}
                          end={{ x: 0.85, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons
                          name={isSaving ? "hourglass-outline" : "save-outline"}
                          size={18}
                          color="#FFFFFF"
                          style={styles.saveIcon}
                        />
                        <Text style={styles.saveText}>
                          {isSaving ? "Lagrer..." : "Lagre vekt"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.74)",
  },
  sheetFrame: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingTop: SHEET_TOP_MARGIN,
    paddingBottom: SHEET_BOTTOM_MARGIN,
  },
  sheetAnimationWrap: {
    width: "100%",
    alignItems: "center",
  },
  sheet: {
    position: "relative",
    width: "100%",
    maxWidth: 560,
    height: SHEET_HEIGHT,
    maxHeight: SHEET_HEIGHT,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.16)",
    backgroundColor: "rgba(2,6,23,0.985)",
    shadowColor: "#020617",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  orbTop: {
    position: "absolute",
    top: -54,
    right: -36,
    width: 172,
    height: 172,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  orbBottom: {
    position: "absolute",
    left: -36,
    bottom: 118,
    width: 144,
    height: 144,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.08)",
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  contentLayout: {
    flex: 1,
  },
  mainStack: {
    rowGap: 17,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(148,163,184,0.92)",
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    padding: 12,
    borderRadius: 17,
    backgroundColor: "rgba(15,23,42,0.58)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    shadowColor: "#020617",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  dateCard: {
    paddingBottom: 13,
  },
  quickCard: {
    paddingBottom: 13,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    columnGap: 10,
  },
  label: {
    fontSize: 11,
    color: "rgba(148,163,184,0.95)",
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  deltaChipDown: {
    backgroundColor: "rgba(13,148,136,0.14)",
    borderColor: "rgba(45,212,191,0.22)",
  },
  deltaChipUp: {
    backgroundColor: "rgba(37,99,235,0.16)",
    borderColor: "rgba(96,165,250,0.22)",
  },
  deltaChipText: {
    ...typography.bodyBlack,
    fontSize: 9,
    color: "#E2E8F0",
    fontWeight: "500",
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "rgba(2,6,23,0.52)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.16)",
  },
  weightInput: {
    flex: 1,
    width: "100%",
    marginRight: 10,
    color: "#F8FAFC",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  inputIconShell: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  dateRow: {
    flexDirection: "row",
    columnGap: 14,
  },
  dateTimeColumn: {
    flex: 1,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  quickButton: {
    position: "relative",
    width: "31.5%",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.58)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)",
    overflow: "hidden",
  },
  quickText: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  tipIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,47,73,0.9)",
    marginRight: 10,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  tipText: {
    ...typography.bodyBlack,
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "rgba(148,163,184,0.95)",
  },
  footerBlock: {
    marginTop: "auto",
    paddingTop: 18,
  },
  saveWrapper: {
    width: "100%",
  },
  saveButton: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 17,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveText: {
    ...typography.bodyBlack,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
