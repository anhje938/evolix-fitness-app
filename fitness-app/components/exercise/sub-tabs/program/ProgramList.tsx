import { Paywall } from "@/components/subscription/Paywall";
import { typography } from "@/config/typography";
import { useSubscription } from "@/context/SubscriptionProvider";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import type { Exercise, Program, Workout } from "@/types/exercise";
import type { AppLanguage } from "@/types/userSettings";
import { getProgramDisplay } from "@/utils/exercise/localizedTraining";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProgramWorkoutCard } from "./ProgramWorkoutCard";

const colors = {
  cardSolid: "rgba(18, 20, 128, 0.18)",
  glassTop: "rgba(255, 255, 255, 0.1)",
  glassMid: "rgba(0, 12, 112, 0)",
  glassNone: "rgba(255,255,255,0)",
  borderSoft: "rgba(96,165,250,0.16)",
  borderExpanded: "rgba(34,211,238,0.44)",
  insetStroke: "rgba(255,255,255,0.04)",
  glow: "rgba(34,211,238,0.18)",
  text: "rgba(248,250,252,0.96)",
  muted: "rgba(191,219,254,0.74)",
  muted2: "rgba(148,163,184,0.76)",
  cyan: "#22d3ee",
  emerald: "#2dd4bf",
  premiumBg: "rgba(251,191,36,0.12)",
  premiumBorder: "rgba(251,191,36,0.22)",
  premiumText: "#FDE68A",
  premiumCard: "rgba(44,34,18,0.94)",
  premiumGlow: "rgba(251,191,36,0.22)",
  premiumStroke: "rgba(251,191,36,0.34)",
  iconBg: "rgba(8,24,54,0.98)",
  iconBorder: "rgba(96,165,250,0.18)",
  actionBorder: "rgba(96,165,250,0.16)",
};

type Props = {
  programs: Program[];
  workoutsByProgramId: Map<string, Workout[]>;
  exerciseMap: Map<string, Exercise>;
  language: AppLanguage;
  onEdit?: (programId: string) => void;
};

export const ProgramList = memo(function ProgramList({
  programs,
  workoutsByProgramId,
  exerciseMap,
  language,
  onEdit,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((programId: string) => {
    setExpandedId((prev) => (prev === programId ? null : programId));
  }, []);

  if (programs.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="albums-outline" size={18} color={colors.text} />
        </View>

        <Text style={[typography.h2, styles.emptyTitle]}>
          Ingen programmer enda
        </Text>

        <Text style={[typography.body, styles.emptySub]}>
          Trykk på <Text style={styles.inlinePlus}>+</Text> for å lage ditt
          første program.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {programs.map((program) => (
        <ProgramListItem
          key={program.id}
          program={program}
          sessions={workoutsByProgramId.get(program.id) ?? []}
          exerciseMap={exerciseMap}
          language={language}
          expanded={expandedId === program.id}
          onToggle={() => toggleExpanded(program.id)}
          onEdit={onEdit}
        />
      ))}
    </View>
  );
});

type ItemProps = {
  program: Program;
  sessions: Workout[];
  exerciseMap: Map<string, Exercise>;
  language: AppLanguage;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: (programId: string) => void;
};

const ProgramListItem = memo(function ProgramListItem({
  program,
  sessions,
  exerciseMap,
  language,
  expanded,
  onToggle,
  onEdit,
}: ItemProps) {
  const { openProgramSession } = useWorkoutSession();
  const { isPremium } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const workoutCount = sessions.length;
  const isProgramLocked = program.isPremium === true && !isPremium;
  const display = getProgramDisplay(program, language);

  const handleToggle = () => {
    if (isProgramLocked) {
      setPaywallVisible(true);
      return;
    }

    onToggle();
  };

  return (
    <View
      style={[
        styles.cardOuter,
        program.isPremium && styles.cardOuterPremium,
        expanded && styles.cardOuterExpanded,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.base, program.isPremium && styles.basePremium]}
      />

      <LinearGradient
        colors={[colors.glassTop, colors.glassMid, colors.glassNone]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <LinearGradient
        colors={
          program.isPremium
            ? [
                "rgba(251,191,36,0.26)",
                "rgba(245,158,11,0.12)",
                "rgba(255,255,255,0)",
              ]
            : [
                "rgba(59,130,246,0.18)",
                "rgba(34,211,238,0.10)",
                "rgba(255,255,255,0)",
              ]
        }
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.accentSheen}
        pointerEvents="none"
      />

      <View
        pointerEvents="none"
        style={[
          styles.outerStroke,
          program.isPremium && styles.outerStrokePremium,
          expanded && styles.outerStrokeExpanded,
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.innerInset, expanded && styles.innerInsetExpanded]}
      />

      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <Pressable
            onPress={handleToggle}
            style={({ pressed }) => [
              styles.headerPress,
              pressed && styles.headerPressed,
            ]}
            hitSlop={8}
          >
            <View style={styles.headerMainRow}>
              <View
                style={[
                  styles.iconCircle,
                  program.isPremium && styles.iconCirclePremium,
                ]}
              >
                <Ionicons
                  name="albums-outline"
                  size={15}
                  color={program.isPremium ? colors.premiumText : colors.cyan}
                />
              </View>

              <View style={styles.headerTextWrap}>
                <View style={styles.titleRow}>
                  <Text
                    style={[typography.bodyBold, styles.title]}
                    numberOfLines={1}
                  >
                    {display.name}
                  </Text>

                  {program.isPremium ? (
                    <View style={styles.premiumBadge}>
                      <Ionicons
                        name="lock-closed"
                        size={10}
                        color={colors.premiumText}
                      />
                      <Text style={styles.premiumBadgeText}>Premium</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaInline}>
                    <Ionicons
                      name="barbell-outline"
                      size={12}
                      color={colors.muted2}
                    />
                    <Text style={styles.metaInlineText}>
                      {workoutCount} økt{workoutCount === 1 ? "" : "er"}
                    </Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaInline}>
                    <Ionicons
                      name="grid-outline"
                      size={12}
                      color={colors.muted2}
                    />
                    <Text style={styles.metaInlineText}>Program</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>

          <View style={styles.rightCol}>
            <View
              style={[
                styles.statusDot,
                isProgramLocked && styles.statusDotLocked,
              ]}
            />

            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={() => {
                  if (isProgramLocked) {
                    setPaywallVisible(true);
                    return;
                  }

                  onEdit?.(program.id);
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.iconPressed,
                ]}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={15} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={handleToggle}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.iconPressed,
                ]}
                hitSlop={10}
              >
                <Ionicons
                  name={
                    expanded ? "chevron-up-outline" : "chevron-down-outline"
                  }
                  size={17}
                  color={colors.text}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {expanded ? (
          <View style={styles.expandedContent}>
            {sessions.length === 0 ? (
              <Text style={[typography.body, styles.emptyText]}>
                Ingen økter koblet til dette programmet ennå.
              </Text>
            ) : (
              <View style={styles.workoutList}>
                {sessions.map((session) => (
                  <ProgramWorkoutCard
                    key={session.id}
                    workout={session}
                    programId={program.id}
                    exerciseMap={exerciseMap}
                    language={language}
                    onStart={(payload) => openProgramSession(payload)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUnlocked={() => {
          setPaywallVisible(false);
          if (!expanded) onToggle();
        }}
        source="premium-program"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  emptyWrap: {
    paddingTop: 18,
    paddingHorizontal: 6,
    gap: 8,
  },
  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  emptyTitle: {
    color: colors.text,
  },
  emptySub: {
    color: colors.muted2,
    fontSize: 13,
  },
  inlinePlus: {
    color: colors.text,
  },
  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
  },
  cardOuterPremium: {
    shadowColor: colors.premiumGlow,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  cardOuterExpanded: {
    shadowColor: colors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardSolid,
  },
  basePremium: {
    backgroundColor: colors.premiumCard,
  },
  accentSheen: {
    position: "absolute",
    top: -44,
    right: -70,
    width: 240,
    height: 200,
    borderRadius: 999,
    opacity: 0.88,
  },
  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  outerStrokePremium: {
    borderColor: colors.premiumStroke,
  },
  outerStrokeExpanded: {
    borderColor: colors.borderExpanded,
  },
  innerInset: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.insetStroke,
  },
  innerInsetExpanded: {
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardInner: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerPress: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
  },
  headerPressed: {
    opacity: 0.96,
  },
  headerMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconBorder,
  },
  iconCirclePremium: {
    backgroundColor: "rgba(120,83,18,0.42)",
    borderColor: "rgba(251,191,36,0.32)",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    letterSpacing: 0.08,
    flexShrink: 1,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: colors.premiumBg,
    borderWidth: 1,
    borderColor: colors.premiumBorder,
  },
  premiumBadgeText: {
    color: colors.premiumText,
    fontSize: 10,
    fontWeight: "900",
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaInlineText: {
    color: colors.muted2,
    fontSize: 12.5,
    fontWeight: "600",
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.40)",
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 4,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.cyan,
  },
  statusDotLocked: {
    backgroundColor: colors.emerald,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.actionBorder,
  },
  iconPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  expandedContent: {
    marginTop: 16,
  },
  workoutList: {
    gap: 12,
  },
  emptyText: {
    color: colors.muted2,
    fontSize: 13,
    fontStyle: "italic",
    paddingBottom: 4,
  },
});
