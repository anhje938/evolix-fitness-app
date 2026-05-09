import {
  MODAL_MAX_HEIGHT,
  modalConfirmButtonColors,
  modalGradientColors,
  modalTheme,
} from "@/config/modalTheme";
import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
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
import DumbbellIcon from "../../../../assets/icons/dumbbell-white.svg";
import XIcon from "../../../../assets/icons/white-x.svg";
import { Divider, Stat } from "./ExerciseBlocks";

type Props = {
  visible: boolean;
  isSaving: boolean;
  sessionName: string;
  titleDraft: string;
  isQuick: boolean;
  isEditingTitle: boolean;
  durationLabel: string;
  totals: {
    exercises: number;
    sets: number;
  };
  keyboardInsetHeight: number;
  footerInsetBottom: number;
  canDelete: boolean;
  finishButtonLabel: string;
  titleInputRef: React.RefObject<RNTextInput | null>;
  contentScrollRef: React.RefObject<any>;
  onChangeTitle: (value: string) => void;
  onCommitTitle: () => void;
  onSetEditingTitle: (value: boolean) => void;
  onStartEditingTitle: () => void;
  onClose: () => void;
  onOpenExercisePicker: () => void;
  onSave: () => void;
  onDelete: () => void;
  onContentScroll: (offsetY: number) => void;
  content: React.ReactNode;
  sessionDateTimeControls?: React.ReactNode;
  saveSummaryOverlay?: React.ReactNode;
  exercisePickerOverlay?: React.ReactNode;
};

export function EditWorkoutSession({
  visible,
  isSaving,
  sessionName,
  titleDraft,
  isQuick,
  isEditingTitle,
  durationLabel,
  totals,
  keyboardInsetHeight,
  footerInsetBottom,
  canDelete,
  finishButtonLabel,
  titleInputRef,
  contentScrollRef,
  onChangeTitle,
  onCommitTitle,
  onSetEditingTitle,
  onStartEditingTitle,
  onClose,
  onOpenExercisePicker,
  onSave,
  onDelete,
  onContentScroll,
  content,
  sessionDateTimeControls,
  saveSummaryOverlay,
  exercisePickerOverlay,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={Keyboard.dismiss} />

        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <LinearGradient
              pointerEvents="none"
              colors={modalGradientColors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.orbTop} />
            <View pointerEvents="none" style={styles.orbBottom} />

            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <DumbbellIcon height={25} width={25} />

                <View style={styles.headerTextWrap}>
                  {isQuick ? (
                    isEditingTitle ? (
                      <View style={styles.titleEditWrap}>
                        <TextInput
                          ref={titleInputRef}
                          value={titleDraft}
                          onChangeText={onChangeTitle}
                          onBlur={() => {
                            onCommitTitle();
                            onSetEditingTitle(false);
                          }}
                          onSubmitEditing={() => {
                            onCommitTitle();
                            onSetEditingTitle(false);
                            Keyboard.dismiss();
                          }}
                          returnKeyType="done"
                          placeholder="Navn på økt"
                          placeholderTextColor={modalTheme.muted}
                          style={[typography.bodyBold, styles.headerTitleInput]}
                          maxLength={50}
                        />

                        <Pressable
                          onPress={() => {
                            onCommitTitle();
                            onSetEditingTitle(false);
                            Keyboard.dismiss();
                          }}
                          hitSlop={8}
                          style={styles.editPencil}
                        >
                          <Ionicons name="checkmark" size={16} color={modalTheme.text} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={onStartEditingTitle}
                        hitSlop={10}
                        style={{ maxWidth: "100%" }}
                      >
                        <Text
                          style={[typography.bodyBold, styles.headerTitle]}
                          numberOfLines={1}
                        >
                          {sessionName}
                        </Text>
                      </Pressable>
                    )
                  ) : (
                    <Text style={[typography.bodyBold, styles.headerTitle]} numberOfLines={1}>
                      {sessionName}
                    </Text>
                  )}

                  <Text style={[typography.body, styles.headerSubtitle]}>
                    Rediger økt
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
                <XIcon height={18} width={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <Stat icon="time-outline" label="Varighet" value={durationLabel} />
              <Divider />
              <Stat icon="barbell-outline" label="Øvelser" value={`${totals.exercises}`} />
              <Divider />
              <Stat icon="list-outline" label="Sett" value={`${totals.sets}`} />
            </View>

            {sessionDateTimeControls ? (
              <View style={styles.sessionDateTimeWrap}>
                {sessionDateTimeControls}
              </View>
            ) : null}

            <View style={styles.topActions}>
              <Pressable
                onPress={onOpenExercisePicker}
                style={({ pressed }) => [
                  styles.addExerciseTopBtn,
                  pressed && styles.actionPressed,
                ]}
              >
                <View style={styles.addExerciseTopInner}>
                  <Ionicons name="add-outline" size={16} color={modalTheme.text} />
                  <Text style={[typography.body, styles.addExerciseTopText]}>
                    Legg til øvelse
                  </Text>
                </View>
              </Pressable>
            </View>

            <ScrollView
              ref={contentScrollRef}
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: Math.max(18, keyboardInsetHeight + 18) },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => {
                onContentScroll(event.nativeEvent.contentOffset.y);
              }}
              scrollEventThrottle={16}
            >
              {content}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(footerInsetBottom + 10, 16) }]}>
              <Pressable
                onPress={onSave}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.finishWrap,
                  isSaving && styles.finishWrapDisabled,
                  pressed && styles.actionPressed,
                ]}
              >
                <LinearGradient colors={modalConfirmButtonColors} style={styles.finishButton}>
                  <Ionicons name="checkmark-done" size={18} color="white" />
                  <Text style={[typography.body, styles.finishText]}>
                    {isSaving ? "Lagrer..." : finishButtonLabel}
                  </Text>
                </LinearGradient>
              </Pressable>

              {canDelete ? (
                <Pressable
                  onPress={onDelete}
                  style={({ pressed }) => [
                    styles.deleteBottomBtn,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={stylesVars.danger} />
                  <Text style={[typography.body, styles.deleteBottomText]}>
                    Slett økt
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {saveSummaryOverlay}
          </View>
        </View>
        {exercisePickerOverlay}
      </View>
    </Modal>
  );
}

const stylesVars = {
  backdrop: modalTheme.backdrop,
  container: modalTheme.surface,
  surface: modalTheme.surfaceMuted,
  border: modalTheme.border,
  borderSoft: modalTheme.borderSoft,
  text: modalTheme.text,
  muted: modalTheme.muted,
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.12)",
  dangerBorder: "rgba(239,68,68,0.25)",
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: stylesVars.backdrop,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 640,
    height: MODAL_MAX_HEIGHT,
    maxHeight: MODAL_MAX_HEIGHT,
    borderRadius: 28,
    backgroundColor: stylesVars.container,
    borderWidth: 1,
    borderColor: stylesVars.border,
    overflow: "hidden",
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: stylesVars.text,
    fontSize: 25,
    fontWeight: "500",
  },
  headerSubtitle: {
    color: stylesVars.muted,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  titleEditWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 8,
  },
  headerTitleInput: {
    color: stylesVars.text,
    fontSize: 25,
    fontWeight: "500",
    paddingVertical: 0,
    paddingHorizontal: 0,
    maxWidth: 240,
  },
  editPencil: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.surface,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
  },
  statsRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: stylesVars.surface,
    borderWidth: 1,
    borderColor: stylesVars.border,
    flexDirection: "row",
    paddingVertical: 5,
  },
  topActions: {
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  sessionDateTimeWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  addExerciseTopBtn: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.surface,
  },
  addExerciseTopInner: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addExerciseTopText: {
    color: stylesVars.text,
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    backgroundColor: "rgba(2,6,23,0.72)",
  },
  finishWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  finishWrapDisabled: {
    opacity: 0.72,
  },
  finishButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  finishText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerBg,
  },
  deleteBottomText: {
    color: stylesVars.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  actionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

