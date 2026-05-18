import { generalStyles } from "@/config/styles";
import { MODAL_MAX_HEIGHT, modalGradientColors, modalTheme } from "@/config/modalTheme";
import { typography } from "@/config/typography";
import { useTranslation } from "@/i18n/translations";
import { useKeyboardAwareSheetScroll } from "@/hooks/useKeyboardAwareSheetScroll";
import { FoodDto } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import XIcon from "../../assets/icons/white-x.svg";
import { AppDateTimePicker } from "../date/AppDateTimePicker";
import { ToggleModeButtons } from "./toggleModeButtons";

type AddMealSheetProps = {
  isOpen: boolean;
  mode: "manual" | "qr";
  setMode: (mode: "manual" | "qr") => void;
  onClose: () => void;
  onSubmit: (values: FoodDto) => Promise<void> | void;
};

const SHEET_MAX_HEIGHT = MODAL_MAX_HEIGHT;
const ENTER_DURATION = 220;
const EXIT_DURATION = 170;

export function AddMealSheet({
  isOpen,
  onClose,
  setMode,
  mode,
  onSubmit,
}: AddMealSheetProps) {
  const { t } = useTranslation();
  const isClosingRef = useRef(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(28)).current;
  const sheetScale = useRef(new Animated.Value(0.985)).current;

  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [timestampUtc, setTimestampUtc] = useState<Date | null>(() => new Date());
  const titleInputRef = useRef<RNTextInput | null>(null);
  const caloriesInputRef = useRef<RNTextInput | null>(null);
  const proteinsInputRef = useRef<RNTextInput | null>(null);
  const carbsInputRef = useRef<RNTextInput | null>(null);
  const fatsInputRef = useRef<RNTextInput | null>(null);
  const {
    handleInputFocus,
    handleScroll,
    keyboardInsetHeight,
    reset,
    scrollRef,
  } = useKeyboardAwareSheetScroll();

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

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
  }, [
    backdropOpacity,
    isOpen,
    reset,
    sheetOpacity,
    sheetScale,
    sheetTranslateY,
  ]);

  if (!isOpen) return null;

  const runExitAnimation = (callback: () => void) => {
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
      callback();
    });
  };

  const handleRequestClose = () => {
    runExitAnimation(onClose);
  };

  const handleModeChange = (nextMode: "manual" | "qr") => {
    if (nextMode === mode) return;
    runExitAnimation(() => setMode(nextMode));
  };

  const handleSave = () => {
    const payload: FoodDto = {
      title: title.trim() || t("mealNamePlaceholder"),
      calories: Number(calories) || 0,
      proteins: Number(proteins) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      timestampUtc: (timestampUtc ?? new Date()).toISOString(),
    };

    try {
      void Promise.resolve(onSubmit(payload));
    } catch (error) {
      if (__DEV__) console.log("Could not save meal", error);
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
      <View style={styles.modalRoot}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleRequestClose}
            accessibilityRole="button"
            accessibilityLabel={t("mealAddTitle")}
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
            <View
              style={[
                generalStyles.newCard,
                styles.sheet,
                { maxHeight: SHEET_MAX_HEIGHT },
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={modalGradientColors}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.orbTop} />
              <View pointerEvents="none" style={styles.orbBottom} />

              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.sheetContent,
                  {
                    paddingBottom: Math.max(18, keyboardInsetHeight + 18),
                  },
                ]}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                <View style={styles.headerRow}>
                  <Text style={[typography.h2, styles.title]}>
                    {t("mealAddTitle")}
                  </Text>
                  <TouchableOpacity
                    onPress={handleRequestClose}
                    style={styles.closeButton}
                    activeOpacity={0.82}
                  >
                    <XIcon height={18} width={18} />
                  </TouchableOpacity>
                </View>

                <View style={styles.toggleWrapper}>
                  <ToggleModeButtons setMode={handleModeChange} mode={mode} />
                </View>

                <View style={styles.section}>
                  <Text style={[typography.bodyBlack, styles.label]}>
                    {t("mealName")}
                  </Text>
                  <TextInput
                    ref={titleInputRef}
                    style={styles.textInput}
                    placeholder={t("mealNamePlaceholder")}
                    value={title}
                    onChangeText={setTitle}
                    onFocus={() => handleInputFocus(titleInputRef.current)}
                    placeholderTextColor="rgba(148,163,184,0.72)"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => caloriesInputRef.current?.focus()}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={[typography.bodyBlack, styles.label]}>
                    {t("homeCalories")}
                  </Text>
                  <View style={styles.calorieContainer}>
                    <TextInput
                      ref={caloriesInputRef}
                      style={[styles.textInput, styles.calorieInput]}
                      placeholder="0"
                      value={calories}
                      onChangeText={setCalories}
                      onFocus={() => handleInputFocus(caloriesInputRef.current)}
                      placeholderTextColor="rgba(148,163,184,0.72)"
                      keyboardType="numeric"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => proteinsInputRef.current?.focus()}
                    />
                    <Ionicons
                      name="flame-outline"
                      size={18}
                      color="rgba(148,163,184,0.88)"
                      style={styles.calorieIcon}
                      pointerEvents="none"
                    />
                  </View>
                </View>

                <View style={[styles.section, styles.macroRow]}>
                  <View style={styles.macroWrapper}>
                    <Text style={[typography.bodyBlack, styles.macroLabel]}>
                      {t("homeProtein")} (g)
                    </Text>
                    <TextInput
                      ref={proteinsInputRef}
                      style={styles.macroInput}
                      placeholder="40"
                      value={proteins}
                      onChangeText={setProteins}
                      onFocus={() => handleInputFocus(proteinsInputRef.current)}
                      placeholderTextColor="rgba(148,163,184,0.72)"
                      keyboardType="numeric"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => carbsInputRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.macroWrapper}>
                    <Text style={[typography.bodyBlack, styles.macroLabel]}>
                      {t("homeCarbsShort")} (g)
                    </Text>
                    <TextInput
                      ref={carbsInputRef}
                      style={styles.macroInput}
                      placeholder="50"
                      value={carbs}
                      onChangeText={setCarbs}
                      onFocus={() => handleInputFocus(carbsInputRef.current)}
                      placeholderTextColor="rgba(148,163,184,0.72)"
                      keyboardType="numeric"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => fatsInputRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.macroWrapper}>
                    <Text style={[typography.bodyBlack, styles.macroLabel]}>
                      {t("homeFat")} (g)
                    </Text>
                    <TextInput
                      ref={fatsInputRef}
                      style={styles.macroInput}
                      placeholder="20"
                      value={fats}
                      onChangeText={setFats}
                      onFocus={() => handleInputFocus(fatsInputRef.current)}
                      placeholderTextColor="rgba(148,163,184,0.72)"
                      keyboardType="numeric"
                      returnKeyType="done"
                      submitBehavior="blurAndSubmit"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[typography.bodyBlack, styles.label]}>
                    {t("modalTiming")}
                  </Text>
                  <AppDateTimePicker
                    label=""
                    mode="time"
                    value={timestampUtc}
                    onChange={setTimestampUtc}
                    compact
                  />
                </View>

                <View style={styles.tipCard}>
                  <View style={styles.tipIconWrapper}>
                    <Ionicons
                      name="restaurant-outline"
                      size={16}
                      color="#67E8F9"
                    />
                  </View>
                  <View style={styles.tipCopy}>
                    <Text style={styles.tipTitle}>
                      {t("mealTipTitle")}
                    </Text>
                    <Text style={styles.tipText}>
                      {t("mealTipBody")}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveWrapper}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={["#06B6D4", "#2563EB"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButton}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={[
                        "rgba(255,255,255,0.2)",
                        "rgba(255,255,255,0.04)",
                        "rgba(255,255,255,0)",
                      ]}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.85, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color="#FFFFFF"
                      style={styles.saveIcon}
                    />
                    <Text style={styles.saveText}>{t("mealSave")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: modalTheme.backdrop,
  },
  sheetFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  sheetAnimationWrap: {
    width: "100%",
    alignItems: "center",
  },
  sheet: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: modalTheme.surface,
    borderWidth: 1,
    borderColor: modalTheme.border,
    shadowColor: modalTheme.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  orbTop: {
    position: "absolute",
    top: -56,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: modalTheme.orbTop,
  },
  orbBottom: {
    position: "absolute",
    left: -36,
    bottom: -72,
    width: 146,
    height: 146,
    borderRadius: 999,
    backgroundColor: modalTheme.orbBottom,
  },
  sheetContent: {
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    color: modalTheme.text,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.35,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleWrapper: {
    marginTop: 4,
    marginBottom: 14,
  },
  section: {
    marginTop: 19,
  },
  label: {
    fontSize: 11.5,
    color: modalTheme.label,
    marginBottom: 7,
    letterSpacing: 0.14,
  },
  textInput: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: "rgba(8,15,28,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    color: "#E5ECFF",
    fontSize: 14.5,
  },
  calorieContainer: {
    position: "relative",
    width: "100%",
  },
  calorieInput: {
    borderColor: "rgba(56,189,248,0.22)",
    paddingRight: 42,
  },
  calorieIcon: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -9,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 12,
  },
  macroWrapper: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 11,
    color: "rgba(191,219,254,0.66)",
    textAlign: "center",
    marginBottom: 7,
  },
  macroInput: {
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: "rgba(8,15,28,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    textAlign: "center",
    fontSize: 15,
    color: "#E5ECFF",
  },
  tipCard: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(8,47,73,0.32)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
  },
  tipIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.74)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    ...typography.bodyBlack,
    fontSize: 12.5,
    color: "#E5ECFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  tipText: {
    ...typography.bodyBlack,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(191,219,254,0.66)",
  },
  saveWrapper: {
    marginTop: 26,
  },
  saveButton: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveText: {
    ...typography.bodyBlack,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
