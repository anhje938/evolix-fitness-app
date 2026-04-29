import {
  AdaptiveRecommendationType,
  RecommendationConfidence,
  type AdaptiveRecommendation,
} from "@/types/adaptive";
import {
  useAcceptAdaptiveRecommendation,
  useDismissAdaptiveRecommendation,
} from "@/hooks/useAdaptive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  recommendation: AdaptiveRecommendation;
  compact?: boolean;
  onChanged?: () => void | Promise<void>;
};

function confidenceLabel(value: RecommendationConfidence): string {
  if (value === RecommendationConfidence.High) return "Høy sikkerhet";
  if (value === RecommendationConfidence.Medium) return "Middels sikkerhet";
  return "Trenger mer data";
}

function recommendationAccent(type: AdaptiveRecommendation["type"]) {
  switch (type) {
    case AdaptiveRecommendationType.ReduceCalories:
    case AdaptiveRecommendationType.IncreaseCalories:
    case AdaptiveRecommendationType.IncreaseProtein:
      return {
        icon: "nutrition-outline",
        color: "rgba(34,197,94,0.95)",
        glow: "rgba(34,197,94,0.14)",
      };
    case AdaptiveRecommendationType.IncreaseLoad:
    case AdaptiveRecommendationType.HoldLoadIncreaseReps:
    case AdaptiveRecommendationType.AddSet:
    case AdaptiveRecommendationType.PrioritizeMuscle:
      return {
        icon: "barbell-outline",
        color: "rgba(56,189,248,0.95)",
        glow: "rgba(56,189,248,0.15)",
      };
    case AdaptiveRecommendationType.NeedMoreData:
      return {
        icon: "analytics-outline",
        color: "rgba(251,191,36,0.96)",
        glow: "rgba(251,191,36,0.13)",
      };
    default:
      return {
        icon: "sparkles-outline",
        color: "rgba(96,165,250,0.96)",
        glow: "rgba(96,165,250,0.13)",
      };
  }
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(Number(value))) return null;
  return `${Number(value).toLocaleString("nb-NO", {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function buildChangeText(recommendation: AdaptiveRecommendation): string | null {
  const nutrition = recommendation.nutritionChange;
  if (nutrition?.currentCalories || nutrition?.suggestedCalories) {
    const current = formatNumber(nutrition.currentCalories, " kcal") ?? "Nå";
    const suggested =
      formatNumber(nutrition.suggestedCalories, " kcal") ?? "Uendret";
    if (
      nutrition.currentCalories !== null &&
      nutrition.currentCalories === nutrition.suggestedCalories
    ) {
      return `Hold ${suggested}`;
    }
    return `${current} → ${suggested}`;
  }

  if (nutrition?.currentProtein || nutrition?.suggestedProtein) {
    const current = formatNumber(nutrition.currentProtein, " g") ?? "Nå";
    const suggested =
      formatNumber(nutrition.suggestedProtein, " g") ?? "Uendret";
    if (
      nutrition.currentProtein !== null &&
      nutrition.currentProtein === nutrition.suggestedProtein
    ) {
      return `Mål: ${suggested} protein`;
    }
    return `${current} → ${suggested} protein`;
  }

  const exercise = recommendation.exerciseTargetChange;
  if (exercise?.suggestedTargetWeightKg) {
    const current =
      formatNumber(exercise.currentTargetWeightKg, " kg") ?? "Neste";
    const suggested =
      formatNumber(exercise.suggestedTargetWeightKg, " kg") ?? "Uendret";
    const reps =
      exercise.minReps && exercise.maxReps
        ? ` x ${exercise.minReps}-${exercise.maxReps}`
        : "";
    return `${current} → ${suggested}${reps}`;
  }

  const recovery = recommendation.recoveryAction;
  if (recovery?.recommendedSession) {
    return `${recovery.recommendedSession} · ${recovery.intensity}`;
  }

  const targetDate = recommendation.targetDateChange;
  if (targetDate) {
    return `${new Date(
      targetDate.currentTargetDateUtc
    ).toLocaleDateString("nb-NO")} → ${new Date(
      targetDate.suggestedTargetDateUtc
    ).toLocaleDateString("nb-NO")}`;
  }

  return null;
}

function hasMeaningfulApplyAction(recommendation: AdaptiveRecommendation): boolean {
  const nutrition = recommendation.nutritionChange;
  if (nutrition) {
    if (
      nutrition.suggestedCalories !== null &&
      nutrition.suggestedCalories !== nutrition.currentCalories
    ) {
      return true;
    }
    if (
      nutrition.suggestedProtein !== null &&
      nutrition.suggestedProtein !== nutrition.currentProtein
    ) {
      return true;
    }
    if (
      nutrition.suggestedCarbs !== null &&
      nutrition.suggestedCarbs !== nutrition.currentCarbs
    ) {
      return true;
    }
    if (
      nutrition.suggestedFat !== null &&
      nutrition.suggestedFat !== nutrition.currentFat
    ) {
      return true;
    }
  }

  const exercise = recommendation.exerciseTargetChange;
  if (exercise) {
    return (
      exercise.suggestedTargetSets !== null ||
      exercise.suggestedTargetWeightKg !== null ||
      exercise.minReps !== null ||
      exercise.maxReps !== null
    );
  }

  const targetDate = recommendation.targetDateChange;
  if (targetDate) {
    return targetDate.suggestedTargetDateUtc !== targetDate.currentTargetDateUtc;
  }

  return false;
}

export function RecommendationCard({
  recommendation,
  compact = false,
  onChanged,
}: Props) {
  const accept = useAcceptAdaptiveRecommendation();
  const dismiss = useDismissAdaptiveRecommendation();
  const accent = recommendationAccent(recommendation.type);
  const changeText = useMemo(
    () => buildChangeText(recommendation),
    [recommendation]
  );
  const hasApplyAction = hasMeaningfulApplyAction(recommendation);
  const isWorking = accept.isPending || dismiss.isPending;

  const handleAccept = async () => {
    await accept.mutateAsync(recommendation.id);
    await onChanged?.();
  };

  const handleDismiss = async () => {
    await dismiss.mutateAsync(recommendation.id);
    await onChanged?.();
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <LinearGradient
        colors={[accent.glow, "rgba(15,23,42,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGlow}
      />

      <View style={styles.header}>
        <View style={[styles.iconBubble, { borderColor: accent.color }]}>
          <Ionicons name={accent.icon as any} size={16} color={accent.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {recommendation.title}
          </Text>
          <Text style={styles.confidence}>
            {confidenceLabel(recommendation.confidence)}
          </Text>
        </View>
      </View>

      {changeText && <Text style={styles.changeText}>{changeText}</Text>}

      <Text
        style={[styles.explanation, compact && styles.explanationCompact]}
        numberOfLines={compact ? 3 : 5}
      >
        {recommendation.explanation}
      </Text>

      <View style={styles.actions}>
        {hasApplyAction && (
          <Pressable
            disabled={isWorking}
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && !isWorking && styles.actionPressed,
              isWorking && styles.actionDisabled,
            ]}
            onPress={handleAccept}
          >
            {accept.isPending ? (
              <ActivityIndicator size="small" color="#02111f" />
            ) : (
              <>
                <Ionicons name="checkmark" size={15} color="#02111f" />
                <Text style={styles.primaryActionText}>Bruk</Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          disabled={isWorking}
          style={({ pressed }) => [
            styles.secondaryAction,
            pressed && !isWorking && styles.actionPressed,
            isWorking && styles.actionDisabled,
          ]}
          onPress={handleDismiss}
        >
          {dismiss.isPending ? (
            <ActivityIndicator size="small" color="rgba(226,232,240,0.92)" />
          ) : (
            <>
              <Ionicons
                name="close"
                size={14}
                color="rgba(226,232,240,0.92)"
              />
              <Text style={styles.secondaryActionText}>Ikke nå</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    backgroundColor: "rgba(15,23,42,0.58)",
    padding: 14,
  },
  cardCompact: {
    padding: 12,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(2,6,23,0.42)",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  confidence: {
    marginTop: 3,
    color: "rgba(148,163,184,0.92)",
    fontSize: 11,
    fontWeight: "600",
  },
  changeText: {
    marginTop: 12,
    color: "rgba(103,232,249,0.96)",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  explanation: {
    marginTop: 8,
    color: "rgba(203,213,225,0.95)",
    fontSize: 13,
    lineHeight: 18,
  },
  explanationCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryAction: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(103,232,249,0.96)",
  },
  primaryActionText: {
    color: "#02111f",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryAction: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "rgba(15,23,42,0.56)",
  },
  secondaryActionText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "700",
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  actionDisabled: {
    opacity: 0.62,
  },
});
