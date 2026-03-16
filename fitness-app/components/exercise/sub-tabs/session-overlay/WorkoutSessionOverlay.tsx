import { typography } from "@/config/typography";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { formatDuration } from "@/utils/session-overlay/formatDuration";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Divider, ExerciseBlock, IconBtn, Stat } from "./ExerciseBlocks";
import { DraggableMinimizedBar } from "./MinimizedWorkoutBar";
import {
  findSuspiciousWeightSets,
  findInvalidCompletedSets,
  normalizeTitle,
  validateSessionForSave,
} from "./overlayGuards";

const SUSPICIOUS_WEIGHT_THRESHOLD_KG = 500;

/**
 * Premium Dark Ocean colors
 */
const overlayColors = {
  backdrop: "rgba(0,0,0,0.70)",
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
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.12)",
  dangerBorder: "rgba(239,68,68,0.25)",
};

export function WorkoutSessionOverlay() {
  const {
    isOpen,
    isMinimized,
    session,
    toggleMinimized,
    closeSession,
    addSet,
    updateSet,
    removeSet,
    finishAndSave,
    renameSession,
    deleteSession,
  } = useWorkoutSession();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<RNTextInput | null>(null);

  const [durationTick, setDurationTick] = useState(0);

  // Reset state when session changes
  useEffect(() => {
    if (!isOpen || !session) return;
    setTitleDraft(session.name ?? "");
    setIsEditingTitle(false);
  }, [isOpen, session?.id, session?.name]);

  // Duration ticker for active sessions
  useEffect(() => {
    if (!isOpen || !session || session.finishedAtUtc) return;
    const t = setInterval(() => setDurationTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [isOpen, session?.id, session?.finishedAtUtc]);

  const isQuick = session?.mode === "quick";

  const startEditingTitle = () => {
    if (!isQuick) return;
    setIsEditingTitle(true);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  const commitTitle = () => {
    const next = normalizeTitle(titleDraft);
    if (!next) {
      setTitleDraft(session?.name ?? "Fri økt");
      return;
    }
    if (next !== session?.name) renameSession(next);
  };

  const getTitleForSave = () => {
    const next = normalizeTitle(titleDraft);
    if (next) return next;
    return session?.name ?? "Fri økt";
  };

  const isEditingCompletedSession = !!session?.id && !!session?.finishedAtUtc;
  const canDeleteCompleted = isEditingCompletedSession;

  const handleDeleteSession = () => {
    if (!canDeleteCompleted) return;

    Alert.alert(
      "Slette økten?",
      "Dette kan ikke angres. Hele økten og alle sett slettes.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            await deleteSession();
          },
        },
      ]
    );
  };

  const visibleExercises = session?.exercises ?? [];

  const sortedExercises = useMemo(() => {
    return visibleExercises.slice().sort((a, b) => a.order - b.order);
  }, [visibleExercises]);

  const durationLabel = useMemo(() => {
    void durationTick;
    return formatDuration(
      session?.startedAtUtc,
      session?.finishedAtUtc ?? null
    );
  }, [session?.startedAtUtc, session?.finishedAtUtc, durationTick]);

  const totals = useMemo(() => {
    let sets = 0;
    let completed = 0;
    for (const ex of visibleExercises) {
      sets += ex.sets.length;
      for (const s of ex.sets) if (s.completed) completed++;
    }
    return { sets, completed, exercises: visibleExercises.length };
  }, [visibleExercises]);

  const handleClose = () => {
    if (isEditingCompletedSession) {
      Alert.alert(
        "Forkaste endringer?",
        "Endringer du har gjort i økten blir ikke lagret.",
        [
          { text: "Fortsett redigering", style: "cancel" },
          { text: "Forkast", style: "destructive", onPress: closeSession },
        ]
      );
      return;
    }

    if (totals.completed <= 0) {
      closeSession();
      return;
    }
    Alert.alert(
      "Avbryt økt?",
      `Du har fullført ${totals.completed} sett. Vil du avbryte økten?`,
      [
        { text: "Fortsett", style: "cancel" },
        { text: "Avbryt", style: "destructive", onPress: closeSession },
      ]
    );
  };

  const handleAbortClose = () => {
    if (isEditingCompletedSession) {
      handleClose();
      return;
    }

    if (totals.exercises <= 0) {
      closeSession();
      return;
    }

    const message =
      totals.completed > 0
        ? `Du har fullfÃ¸rt ${totals.completed} sett. Vil du avbryte Ã¸kten?`
        : totals.sets > 0
          ? "Du har lagt til Ã¸velser eller sett som ikke er lagret. Vil du avbryte Ã¸kten?"
          : "Vil du avbryte Ã¸kten?";

    Alert.alert("Avbryt Ã¸kt?", message, [
      { text: "Fortsett", style: "cancel" },
      { text: "Avbryt", style: "destructive", onPress: closeSession },
    ]);
  };

  const handleFinish = async () => {
    if (!session) return;
    const nameOverride = getTitleForSave();
    commitTitle();

    const beforeSaveAction = isEditingCompletedSession
      ? "lagrer endringene"
      : "fullfører";

    const issues = findInvalidCompletedSets(session.exercises);
    if (issues.length > 0) {
      const first = issues[0];
      Alert.alert(
        "Ugyldige sett",
        issues.length > 1
          ? `Du har ${issues.length} ferdig-markerte sett med ugyldige verdier.\n\nEksempel:\n${first.exerciseName} - sett ${first.setIndex}: ${first.reason}\n\nRett opp før du ${beforeSaveAction}.`
          : `Du har et ferdig-markert sett med ugyldige verdier:\n\n${first.exerciseName} - sett ${first.setIndex}: ${first.reason}\n\nRett opp før du ${beforeSaveAction}.`,
        [{ text: "OK" }]
      );
      return;
    }

    const res = validateSessionForSave(session.exercises);
    if (!res.ok) {
      Alert.alert(
        isEditingCompletedSession
          ? "Kan ikke lagre endringer"
          : "Kan ikke fullføre",
        res.message
      );
      return;
    }

    const suspiciousWeights = findSuspiciousWeightSets(
      session.exercises,
      SUSPICIOUS_WEIGHT_THRESHOLD_KG
    );
    if (suspiciousWeights.length > 0) {
      const first = suspiciousWeights[0];
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Uvanlig høy vekt",
          suspiciousWeights.length > 1
            ? `Vi fant ${suspiciousWeights.length} sett med minst ${SUSPICIOUS_WEIGHT_THRESHOLD_KG} kg.\n\nEksempel:\n${first.exerciseName} - sett ${first.setIndex}: ${first.weight} kg\n\nEr du sikker på at dette stemmer?`
            : `Dette settet er registrert med ${first.weight} kg:\n\n${first.exerciseName} - sett ${first.setIndex}\n\nEr du sikker på at dette stemmer?`,
          [
            { text: "Gå tilbake", style: "cancel", onPress: () => resolve(false) },
            { text: "Ja, lagre", onPress: () => resolve(true) },
          ]
        );
      });

      if (!shouldContinue) {
        return;
      }
    }

    Keyboard.dismiss();

    await finishAndSave({ nameOverride });
  };

  if (!isOpen || !session) return null;

  if (isMinimized) {
    return (
      <DraggableMinimizedBar
        title={session.name}
        subtitle={`${durationLabel} · ${totals.exercises} øvelser · ${totals.sets} sett`}
        onExpand={toggleMinimized}
      />
    );
  }

  const modeLabel = session.mode === "quick" ? "Fri økt" : "Planlagt økt";
  const closeButtonLabel = isEditingCompletedSession ? "Lukk" : "Avbryt økt";
  const finishButtonLabel = isEditingCompletedSession
    ? "Lagre endringer"
    : "Fullfør økt";

  return (
    <Modal visible={isOpen} animationType="fade" transparent>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={Keyboard.dismiss} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            {/* Glass overlay */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.06)",
                "rgba(255,255,255,0.02)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

          {/* HEADER */}
          <View style={styles.headerRow}>
            <IconBtn
              icon="close-outline"
              onPress={handleAbortClose}
              label={closeButtonLabel}
              tone="danger"
            />

            <View style={styles.headerCenter}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name="barbell"
                  size={18}
                  color={overlayColors.accent}
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                {isQuick ? (
                  isEditingTitle ? (
                    <View style={styles.titleEditWrap}>
                      <TextInput
                        ref={(el) => {
                          titleInputRef.current = el;
                        }}
                        value={titleDraft}
                        onChangeText={setTitleDraft}
                        onBlur={() => {
                          commitTitle();
                          setIsEditingTitle(false);
                        }}
                        onSubmitEditing={() => {
                          commitTitle();
                          setIsEditingTitle(false);
                          Keyboard.dismiss();
                        }}
                        returnKeyType="done"
                        placeholder="Navn på økt"
                        placeholderTextColor={overlayColors.muted2}
                        style={[typography.bodyBold, styles.headerTitleInput]}
                        maxLength={50}
                      />

                      <Pressable
                        onPress={() => {
                          commitTitle();
                          setIsEditingTitle(false);
                          Keyboard.dismiss();
                        }}
                        hitSlop={8}
                        style={styles.editPencil}
                      >
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={overlayColors.accent}
                        />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={startEditingTitle}
                      hitSlop={10}
                      style={{ maxWidth: "100%" }}
                    >
                      <Text
                        style={[typography.bodyBold, styles.headerTitle]}
                        numberOfLines={1}
                      >
                        {session.name}
                      </Text>
                    </Pressable>
                  )
                ) : (
                  <Text
                    style={[typography.bodyBold, styles.headerTitle]}
                    numberOfLines={1}
                  >
                    {session.name}
                  </Text>
                )}

                <Text style={[typography.body, styles.headerSubtitle]}>
                  {modeLabel}
                </Text>
              </View>
            </View>

            <IconBtn
              icon="remove-outline"
              onPress={toggleMinimized}
              label="Minimer"
            />
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <Stat icon="time-outline" label="Varighet" value={durationLabel} />
            <Divider />
            <Stat
              icon="barbell-outline"
              label="Øvelser"
              value={`${totals.exercises}`}
            />
            <Divider />
            <Stat icon="list-outline" label="Sett" value={`${totals.sets}`} />
          </View>

          {/* TOP ACTIONS (kun for utførte økter) */}
          {canDeleteCompleted && (
            <View style={styles.topActions}>
              <Pressable
                onPress={handleDeleteSession}
                style={({ pressed }) => [
                  styles.deleteTopBtn,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={styles.deleteTopInner}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={overlayColors.danger}
                  />
                  <Text style={[typography.body, styles.deleteTopText]}>
                    Slett økt
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* CONTENT */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 18 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {sortedExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="barbell-outline"
                    size={32}
                    color={overlayColors.muted2}
                  />
                </View>
                <Text style={[typography.body, styles.emptyTitle]}>
                  Ingen øvelser lagt til
                </Text>
                <Text style={[typography.body, styles.emptySubtitle]}>
                  Legg til øvelser for å starte økten
                </Text>
              </View>
            ) : (
              sortedExercises.map((ex) => (
                <ExerciseBlock
                  key={ex.id}
                  exercise={ex}
                  onAddSet={() => addSet(ex.id)}
                  onUpdateSet={(setId, partial) =>
                    updateSet(ex.id, setId, partial)
                  }
                  onRemoveSet={(setId) => removeSet(ex.id, setId)}
                />
              ))
            )}
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.finishWrap,
                pressed && { opacity: 0.96 },
              ]}
            >
              <View style={styles.finishButton}>
                <Ionicons name="checkmark-done" size={18} color="white" />
                <Text style={[typography.body, styles.finishText]}>{finishButtonLabel}</Text>
              </View>
            </Pressable>
          </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlayColors.backdrop,
  },

  sheetWrap: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 36,
  },

  sheet: {
    marginHorizontal: 14,
    marginBottom: 18,
    maxHeight: "92%",
    borderRadius: 22,
    backgroundColor: overlayColors.container,
    borderWidth: 1,
    borderColor: overlayColors.border,
    overflow: "hidden",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },

  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 10,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  headerTitle: {
    color: overlayColors.text,
    fontSize: 16,
    letterSpacing: 0.1,
  },

  headerSubtitle: {
    color: overlayColors.muted2,
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.1,
  },

  titleEditWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 8,
  },

  headerTitleInput: {
    color: overlayColors.text,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    maxWidth: 240,
  },

  editPencil: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  // Stats
  statsRow: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.border,
    flexDirection: "row",
    paddingVertical: 12,
  },

  // Top actions
  topActions: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  deleteTopBtn: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: overlayColors.dangerBorder,
    backgroundColor: overlayColors.dangerBg,
  },

  deleteTopInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  deleteTopText: {
    color: overlayColors.danger,
    fontSize: 13,
    fontWeight: "700",
  },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 8 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    marginBottom: 16,
  },

  emptyTitle: {
    color: overlayColors.muted,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },

  emptySubtitle: {
    color: overlayColors.muted2,
    fontSize: 13,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: overlayColors.border,
    backgroundColor: overlayColors.container,
  },

  finishWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },

  finishButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    backgroundColor: overlayColors.accent,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  finishText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
