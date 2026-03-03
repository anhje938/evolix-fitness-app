import { typography } from "@/config/typography";
import type { SessionExercise, SessionSet } from "@/types/exercise";
import { parseNullableFloat } from "@/utils/session-overlay/parseNullableFloat";
import { parseNullableInt } from "@/utils/session-overlay/parseNullableInt";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect, useMemo, useRef } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  State as GestureState,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { clamp, isNonNegativeNumber, isPositiveInt } from "./overlayGuards";

/**
 * Premium Dark Ocean colors
 */
const overlayColors = {
  container: "rgba(15,23,42,0.98)",
  surface: "rgba(255,255,255,0.04)",
  input: "rgba(30,41,59,0.95)",
  text: "#E5ECFF",
  muted: "rgba(148,163,184,0.9)",
  muted2: "rgba(148,163,184,0.7)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.2)",
  accentBg: "rgba(6,182,212,0.08)",
  green: "rgba(34,197,94,0.9)",
  greenBg: "rgba(34,197,94,0.12)",
  greenBorder: "rgba(34,197,94,0.25)",
  danger: "#ef4444",
};

const ROW_METRICS = {
  indexW: 22,
  doneW: 44,
  inputSideGap: 4,
  doneLeftGap: 6,
  rightBuffer: 8,
};

/**
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

export const IconBtn = memo(function IconBtn({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={18} color={overlayColors.text} />
    </Pressable>
  );
});

export const Stat = memo(function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={overlayColors.muted2} />
      <Text style={[typography.body, styles.statLabel]}>{label}</Text>
      <Text style={[typography.body, styles.statValue]}>{value}</Text>
    </View>
  );
});

export const Divider = memo(function Divider() {
  return <View style={styles.statsDivider} />;
});

/**
 * ============================================================
 * EXERCISE BLOCK
 * ============================================================
 */

type ExerciseBlockProps = {
  exercise: SessionExercise;
  onAddSet: () => void;
  onUpdateSet: (setId: string, partial: Partial<SessionSet>) => void;
  onRemoveSet: (setId: string) => void;
};

export const ExerciseBlock = memo(function ExerciseBlock({
  exercise,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: ExerciseBlockProps) {
  const repsRefs = useRef<Array<RNTextInput | null>>([]);
  const weightRefs = useRef<Array<RNTextInput | null>>([]);

  const ensuredForIdRef = useRef<string | null>(null);
  const didEnsureRef = useRef(false);
  if (ensuredForIdRef.current !== exercise.id) {
    ensuredForIdRef.current = exercise.id;
    didEnsureRef.current = false;
  }

  useEffect(() => {
    if (didEnsureRef.current) return;
    if (exercise.sets.length > 0) {
      didEnsureRef.current = true;
      return;
    }
    didEnsureRef.current = true;
    onAddSet();
  }, [exercise.sets.length, onAddSet]);

  const toggleCompletedGuarded = (set: SessionSet, setIndex: number) => {
    const nextCompleted = !set.completed;

    if (nextCompleted) {
      if (!isPositiveInt(set.reps)) {
        Alert.alert(
          "Mangler reps",
          `Skriv inn reps (> 0) før du markerer settet som ferdig.\n\n${exercise.name} – sett ${setIndex}: reps må være > 0`
        );
        return;
      }
      if (set.weight != null && !isNonNegativeNumber(set.weight)) {
        Alert.alert(
          "Ugyldig vekt",
          `${exercise.name} – sett ${setIndex}: vekt kan ikke være negativ`
        );
        return;
      }
    }

    onUpdateSet(set.id, { completed: nextCompleted });
  };

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeaderRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[typography.body, styles.exerciseTitle]}>
            {exercise.name}
          </Text>
          {!!exercise.muscle && (
            <Text style={[typography.body, styles.exerciseSubtitle]}>
              {exercise.muscle}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onAddSet}
          hitSlop={8}
          style={({ pressed }) => [
            styles.addSetAction,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add" size={16} color={overlayColors.accent} />
          <Text style={[typography.body, styles.addSetText]}>
            Legg til sett
          </Text>
        </Pressable>
      </View>

      <View style={styles.setHeaderRow}>
        <Text style={[typography.body, styles.setHeaderIndex]}>#</Text>

        <View style={styles.headerCellWrap}>
          <Text style={[typography.body, styles.setHeaderCellText]}>Kg</Text>
        </View>

        <View style={styles.headerCellWrap}>
          <Text style={[typography.body, styles.setHeaderCellText]}>Reps</Text>
        </View>

        <View style={styles.headerDoneWrap}>
          <Text style={[typography.body, styles.setHeaderCellText]}>
            Ferdig
          </Text>
        </View>

        <View style={{ width: ROW_METRICS.rightBuffer }} />
      </View>

      {exercise.sets.map((set, idx) => (
        <SwipeToDeleteRow
          key={set.id}
          onDelete={() => onRemoveSet(set.id)}
          height={32}
          snapOpenThreshold={0.2}
        >
          <View style={styles.setRow}>
            <Text style={[typography.body, styles.setIndex]}>{idx + 1}</Text>

            <TextInput
              ref={(el) => {
                weightRefs.current[idx] = el;
              }}
              style={[typography.body, styles.setInput]}
              keyboardType="numeric"
              placeholder="-"
              placeholderTextColor={overlayColors.muted2}
              value={set.weight ?? set.weight === 0 ? String(set.weight) : ""}
              returnKeyType="next"
              blurOnSubmit={false}
              submitBehavior="submit"
              onSubmitEditing={() => repsRefs.current[idx]?.focus()}
              onChangeText={(txt) =>
                onUpdateSet(set.id, { weight: parseNullableFloat(txt) })
              }
            />

            <TextInput
              ref={(el) => {
                repsRefs.current[idx] = el;
              }}
              style={[typography.body, styles.setInput]}
              keyboardType="numeric"
              placeholder="-"
              placeholderTextColor={overlayColors.muted2}
              value={set.reps ?? set.reps === 0 ? String(set.reps) : ""}
              returnKeyType={idx === exercise.sets.length - 1 ? "done" : "next"}
              blurOnSubmit={idx === exercise.sets.length - 1}
              submitBehavior={
                idx === exercise.sets.length - 1 ? "blurAndSubmit" : "submit"
              }
              onSubmitEditing={() => {
                if (idx < exercise.sets.length - 1) {
                  weightRefs.current[idx + 1]?.focus();
                } else {
                  Keyboard.dismiss();
                }
              }}
              onChangeText={(txt) =>
                onUpdateSet(set.id, { reps: parseNullableInt(txt) })
              }
            />

            <Pressable
              onPress={() => toggleCompletedGuarded(set, idx + 1)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.doneBtn,
                set.completed && styles.doneBtnActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name={
                  set.completed
                    ? "checkmark-circle"
                    : "checkmark-circle-outline"
                }
                size={18}
                color={set.completed ? overlayColors.green : overlayColors.text}
              />
            </Pressable>

            <View
              style={{ width: ROW_METRICS.rightBuffer }}
              pointerEvents="none"
            />
          </View>
        </SwipeToDeleteRow>
      ))}
    </View>
  );
});

/**
 * ============================================================
 * SWIPE TO DELETE ROW
 * ============================================================
 */

const SwipeToDeleteRow = memo(function SwipeToDeleteRow({
  children,
  onDelete,
  height,
  snapOpenThreshold = 0.2,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  height: number;
  snapOpenThreshold?: number;
}) {
  const ACTION_W = 56;
  const GAP = ROW_METRICS.rightBuffer;
  const OPEN = ACTION_W + GAP;

  const baseX = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  const baseNumRef = useRef(0);
  const dragNumRef = useRef(0);

  useEffect(() => {
    const sub = dragX.addListener(({ value }) => {
      dragNumRef.current = value;
    });
    return () => dragX.removeListener(sub);
  }, [dragX]);

  const translateX = useMemo(() => {
    return Animated.add(baseX, dragX).interpolate({
      inputRange: [-OPEN, 0],
      outputRange: [-OPEN, 0],
      extrapolate: "clamp",
    });
  }, [baseX, dragX, OPEN]);

  const setBaseTo = (v: number) => {
    baseNumRef.current = v;
    baseX.setValue(v);
  };

  const springBaseTo = (toValue: number) => {
    Animated.spring(baseX, {
      toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start(() => {
      baseNumRef.current = toValue;
    });
  };

  const close = () => {
    dragX.setValue(0);
    springBaseTo(0);
  };

  const actionTranslateX = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-OPEN, 0],
      outputRange: [0, OPEN],
      extrapolate: "clamp",
    });
  }, [translateX, OPEN]);

  const actionOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-OPEN, -10, 0],
      outputRange: [1, 1, 0],
      extrapolate: "clamp",
    });
  }, [translateX, OPEN]);

  const onGestureEvent = useMemo(
    () =>
      Animated.event([{ nativeEvent: { translationX: dragX } }], {
        useNativeDriver: true,
      }),
    [dragX]
  );

  const onHandlerStateChange = (evt: any) => {
    const state: GestureState = evt.nativeEvent.state;
    if (state !== GestureState.END && state !== GestureState.CANCELLED) return;

    const vx: number = evt.nativeEvent.velocityX ?? 0;

    const raw = baseNumRef.current + dragNumRef.current;
    const pos = clamp(raw, -OPEN, 0);

    setBaseTo(pos);
    dragX.setValue(0);

    const visibleFraction = Math.abs(pos) / OPEN;

    const shouldOpen =
      visibleFraction >= snapOpenThreshold || vx < -0.18 || pos < -OPEN * 0.18;

    springBaseTo(shouldOpen ? -OPEN : 0);
  };

  return (
    <View style={[styles.swipeRowWrap, { height }]}>
      <PanGestureHandler
        activeOffsetX={[-10, 10]}
        failOffsetY={[-12, 12]}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={styles.swipeHandlerWrap}>
          <View style={styles.swipeUnderlay} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.deleteActionFollow,
                {
                  width: ACTION_W,
                  height,
                  marginRight: GAP,
                  transform: [{ translateX: actionTranslateX }],
                  opacity: actionOpacity,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  close();
                  onDelete();
                }}
                style={styles.deleteActionPress}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
              </Pressable>
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.swipeForeground, { transform: [{ translateX }] }]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

/**
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  // Small UI components
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  statLabel: {
    color: overlayColors.muted2,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  statValue: {
    color: overlayColors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  statsDivider: {
    width: 1,
    backgroundColor: overlayColors.borderSoft,
    marginVertical: 6,
  },

  // Exercise card
  exerciseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: overlayColors.border,
    backgroundColor: overlayColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },

  exerciseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },

  exerciseTitle: {
    color: overlayColors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  exerciseSubtitle: {
    color: overlayColors.muted2,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
  },

  addSetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  addSetText: {
    color: overlayColors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // Set rows
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 8,
    opacity: 0.9,
  },

  setHeaderIndex: {
    width: ROW_METRICS.indexW,
    textAlign: "center",
    color: overlayColors.muted2,
    fontSize: 11,
    fontWeight: "700",
  },

  headerCellWrap: {
    flex: 1,
    marginHorizontal: ROW_METRICS.inputSideGap,
    alignItems: "center",
  },

  headerDoneWrap: {
    width: ROW_METRICS.doneW,
    marginLeft: ROW_METRICS.doneLeftGap,
    alignItems: "center",
    justifyContent: "center",
  },

  setHeaderCellText: {
    color: overlayColors.muted2,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  setRow: { flexDirection: "row", alignItems: "center", height: 32 },

  setIndex: {
    width: ROW_METRICS.indexW,
    textAlign: "center",
    color: overlayColors.muted2,
    fontSize: 12,
    fontWeight: "700",
  },

  setInput: {
    flex: 1,
    backgroundColor: overlayColors.input,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    color: overlayColors.text,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: ROW_METRICS.inputSideGap,
    borderWidth: 1,
    borderColor: overlayColors.border,
  },

  doneBtn: {
    width: ROW_METRICS.doneW,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    marginLeft: ROW_METRICS.doneLeftGap,
  },

  doneBtnActive: {
    borderColor: overlayColors.greenBorder,
    backgroundColor: overlayColors.greenBg,
  },

  // Swipe to delete
  swipeRowWrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "transparent",
  },

  swipeHandlerWrap: { width: "100%", height: "100%" },

  swipeUnderlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "flex-end",
  },

  swipeForeground: { width: "100%", height: "100%", justifyContent: "center" },

  deleteActionFollow: {
    borderRadius: 10,
    backgroundColor: overlayColors.danger,
    overflow: "hidden",
  },

  deleteActionPress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
