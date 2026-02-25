import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { typography } from "@/config/typography";
import type { HomeGoalTile, UserSettings } from "@/types/userSettings";
import { ProgressCircle } from "../food/progressCircle";

type Totals = {
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
};

type Props = {
  todayTotals: Totals;
  settings: UserSettings;
  onPressEdit?: () => void;
};

const colors = {
  cardBg: "rgba(255,255,255,0.035)",
  border: "rgba(255,255,255,0.06)",
  inner: "rgba(0,0,0,0.18)",

  title: "rgba(229,236,255,0.95)",
  muted: "rgba(148,163,184,0.85)",
  muted2: "rgba(148,163,184,0.70)",

  pillBg: "rgba(255,255,255,0.04)",
  pillBorder: "rgba(255,255,255,0.06)",
};

type TileItem = {
  key: HomeGoalTile;
  label: string;
  unit: string;
  current: number;
  max: number;
  percentage: number;
};

function tileLabel(tile: HomeGoalTile) {
  switch (tile) {
    case "calories":
      return "Kalorier";
    case "protein":
      return "Protein";
    case "carbs":
      return "Karbo";
    case "fat":
      return "Fett";
  }
}

function tileUnit(tile: HomeGoalTile) {
  return tile === "calories" ? "kcal" : "g";
}

function clampPct(p: number) {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(160, p));
}

export default function DailyGoalsCard({
  todayTotals,
  settings,
  onPressEdit,
}: Props) {
  // Ensure list exists + valid, and ALWAYS keep calories at top if enabled
  const rawTiles = settings.homeGoalTiles?.length
    ? settings.homeGoalTiles
    : (["calories", "protein", "carbs", "fat"] as HomeGoalTile[]);

  // Remove duplicates + keep stable order
  const uniqueTiles = useMemo(() => {
    const seen = new Set<HomeGoalTile>();
    const out: HomeGoalTile[] = [];
    for (const t of rawTiles) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  }, [rawTiles]);

  const enabled = useMemo(() => {
    const hasCalories = uniqueTiles.includes("calories");
    const others = uniqueTiles.filter((t) => t !== "calories");

    // If calories is enabled -> top + others under
    if (hasCalories) return ["calories" as const, ...others];

    // If calories not enabled -> show only the other ones (still works 1–3)
    return others;
  }, [uniqueTiles]);

  const itemsByKey = useMemo(() => {
    const mk = (t: HomeGoalTile): TileItem => {
      if (t === "calories") {
        const cur = todayTotals.totalCalories ?? 0;
        const max = settings.calorieGoal ?? 0;
        const pct = max > 0 ? (cur / max) * 100 : 0;
        return {
          key: t,
          label: tileLabel(t),
          unit: tileUnit(t),
          current: cur,
          max,
          percentage: clampPct(pct),
        };
      }

      if (t === "protein") {
        const cur = todayTotals.totalProteins ?? 0;
        const max = settings.proteinGoal ?? 0;
        const pct = max > 0 ? (cur / max) * 100 : 0;
        return {
          key: t,
          label: tileLabel(t),
          unit: tileUnit(t),
          current: cur,
          max,
          percentage: clampPct(pct),
        };
      }

      if (t === "carbs") {
        const cur = todayTotals.totalCarbs ?? 0;
        const max = settings.carbGoal ?? 0;
        const pct = max > 0 ? (cur / max) * 100 : 0;
        return {
          key: t,
          label: tileLabel(t),
          unit: tileUnit(t),
          current: cur,
          max,
          percentage: clampPct(pct),
        };
      }

      // fat
      const cur = todayTotals.totalFats ?? 0;
      const max = settings.fatGoal ?? 0;
      const pct = max > 0 ? (cur / max) * 100 : 0;
      return {
        key: t,
        label: tileLabel(t),
        unit: tileUnit(t),
        current: cur,
        max,
        percentage: clampPct(pct),
      };
    };

    const map = new Map<HomeGoalTile, TileItem>();
    for (const t of enabled) map.set(t, mk(t));
    return map;
  }, [enabled, todayTotals, settings]);

  const topKey: HomeGoalTile | null =
    enabled.length > 0 && enabled[0] === "calories" ? "calories" : null;

  const bottomKeys = useMemo(() => {
    // Bottom row should be protein/carb/fat (in whatever order user selected),
    // but only those that are enabled and not calories
    return enabled.filter((t) => t !== "calories").slice(0, 3);
  }, [enabled]);

  const bottomCount = bottomKeys.length;

  const topItem = topKey ? itemsByKey.get(topKey) ?? null : null;
  const bottomItems = bottomKeys
    .map((k) => itemsByKey.get(k))
    .filter(Boolean) as TileItem[];

  // Layout rules:
  // - If calories enabled: it is ALWAYS the top circle.
  // - Bottom row: up to 3 circles, evenly spaced.
  // - If calories disabled: show only bottom row (1–3), centered.
  const hasTop = !!topItem;
  const hasAny = hasTop || bottomItems.length > 0;

  if (!hasAny) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.body, styles.headerTitle]} numberOfLines={1}>
          Dagens mål
        </Text>

        {!!onPressEdit && (
          <TouchableOpacity
            onPress={onPressEdit}
            activeOpacity={0.85}
            style={styles.editBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="options-outline" size={16} color={colors.title} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inner}>
        {/* TOP: Calories */}
        {topItem && (
          <View style={styles.topArea}>
            <View style={styles.topCircleWrap}>
              <ProgressCircle
                percentage={topItem.percentage}
                currentValue={topItem.current}
                maxValue={topItem.max}
                size={130}
                strokeWidth={9}
                subLabel={topItem.unit}
                labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                valueStyle={styles.circleValue}
                fractionStyle={styles.circleFraction}
                subLabelStyle={styles.circleUnit}
              />
              <Text
                style={[typography.body, styles.topLabel]}
                numberOfLines={1}
              >
                {topItem.label}
              </Text>
            </View>
          </View>
        )}

        {/* BOTTOM: Protein / Carbs / Fat (1–3 supported) */}
        {bottomItems.length > 0 && (
          <View
            style={[
              styles.bottomRow,
              bottomCount === 1 && styles.bottomRow1,
              bottomCount === 2 && styles.bottomRow2,
              bottomCount === 3 && styles.bottomRow3,
            ]}
          >
            {bottomItems.map((it) => (
              <View
                key={it.key}
                style={[
                  styles.bottomTile,
                  bottomCount === 1 && styles.bottomTile1,
                  bottomCount === 2 && styles.bottomTile2,
                  bottomCount === 3 && styles.bottomTile3,
                ]}
              >
                <ProgressCircle
                  percentage={it.percentage}
                  currentValue={it.current}
                  maxValue={it.max}
                  size={92}
                  strokeWidth={8}
                  subLabel={it.unit}
                  labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                  valueStyle={styles.circleValue}
                  fractionStyle={styles.circleFraction}
                  subLabelStyle={styles.circleUnit}
                />
                <Text
                  style={[typography.body, styles.tileLabel]}
                  numberOfLines={1}
                >
                  {it.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 18,
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  headerTitle: {
    color: colors.title,
    fontSize: 13,
    fontWeight: "400",
    opacity: 0.95,
  },

  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillBorder,
  },

  inner: {
    backgroundColor: colors.inner,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 10,
  },

  // TOP
  topArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
  },
  topCircleWrap: {
    alignItems: "center",
  },
  topLabel: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "300",
  },

  // BOTTOM
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },

  bottomRow1: {
    justifyContent: "center",
  },
  bottomRow2: {
    justifyContent: "space-between",
  },
  bottomRow3: {
    justifyContent: "space-between",
  },

  bottomTile: {
    alignItems: "center",
  },

  bottomTile1: {
    width: "100%",
  },
  bottomTile2: {
    width: "48%",
  },
  bottomTile3: {
    width: "32%",
  },

  tileLabel: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "300",
  },

  // Circle text look
  circleValue: {
    color: "rgba(224,237,255,0.98)",
    fontWeight: "500",
    letterSpacing: -0.2,
  },

  circleFraction: {
    color: "rgba(148,163,184,0.85)",
    fontWeight: "300",
  },

  circleUnit: {
    color: "rgba(148,163,184,0.85)",
    fontWeight: "300",
  },
});
