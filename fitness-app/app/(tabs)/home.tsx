// app/(tabs)/home.tsx
import { deleteMyUser, fetchMyUser } from "@/api/user";
import SettingsLogo from "@/assets/icons/white-settings.svg";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import AnatomyFigure from "@/components/exercise/AnatomyFigure";
import { ProgressCircle } from "@/components/food/progressCircle";
import { WeightSummaryBox } from "@/components/home/WeightSummary";
import QuickStartButtons from "@/components/home/quickStartButtons";
import SettingsModal from "@/components/settings/SettingsModal";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useFoodContext } from "@/context/FoodProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWeightContext } from "@/context/WeightProvider";
import { useExercises } from "@/hooks/useExercises";
import { useRecoveryMap } from "@/hooks/useRecoveryMap";
import { useCompletedWorkouts } from "@/hooks/workout-history/useCompletedWorkouts";
import type { HomeGoalTile, HomeSectionKey } from "@/types/userSettings";
import { muscleToSlug } from "@/utils/recovery/muscleToSlug";
import { toBodyHighlighterData } from "@/utils/recovery/toBodyHighlighterData";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ui = {
  text: "rgba(229,236,255,0.95)",
  muted: "rgba(148,163,184,0.85)",
  pillBg: "rgba(255,255,255,0.04)",
  pillBorder: "rgba(255,255,255,0.06)",
};

const ALL_TILES: HomeGoalTile[] = ["calories", "protein", "carbs", "fat"];
const HOME_SECTION_ORDER_FALLBACK: HomeSectionKey[] = [
  "quickStart",
  "goals",
  "weight",
  "recoveryMap",
];

const labelMap: Record<HomeGoalTile, string> = {
  calories: "Kalorier",
  protein: "Proteiner",
  carbs: "Karbohydrater",
  fat: "Fett",
};

const shortLabelMap: Record<HomeGoalTile, string> = {
  calories: "Kalorier",
  protein: "Protein",
  carbs: "Karbo",
  fat: "Fett",
};

const circleAccents: Record<HomeGoalTile, string> = {
  calories: "rgba(255,159,28,1)", // orange
  protein: "rgba(168,85,247,1)", // purple
  carbs: "rgba(6,182,212,1)", // cyan
  fat: "rgba(34,197,94,1)", // green
};

function clampPct(p: number) {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(160, p));
}

function calcPct(current: number, goal: number) {
  if (!Number.isFinite(current)) return 0;
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return clampPct((current / goal) * 100);
}

function normalizeHomeSectionOrder(
  input: HomeSectionKey[] | undefined
): HomeSectionKey[] {
  if (!Array.isArray(input)) return [...HOME_SECTION_ORDER_FALLBACK];

  const seen = new Set<HomeSectionKey>();
  const next: HomeSectionKey[] = [];

  for (const raw of input) {
    if (!HOME_SECTION_ORDER_FALLBACK.includes(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    next.push(raw);
  }

  if (next.length !== HOME_SECTION_ORDER_FALLBACK.length) {
    for (const key of HOME_SECTION_ORDER_FALLBACK) {
      if (!seen.has(key)) next.push(key);
    }
  }

  return next;
}

function readRecovery01(entry: unknown): number {
  if (typeof entry === "number") return Math.max(0, Math.min(1, entry));
  if (!entry || typeof entry !== "object") return 1;
  const anyEntry = entry as any;
  const raw = Number(
    anyEntry.value01 ?? anyEntry.recovery ?? anyEntry.value ?? 1
  );
  if (!Number.isFinite(raw)) return 1;
  return Math.max(0, Math.min(1, raw));
}

function readLastStimulusAtUtc(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const anyEntry = entry as any;
  if (typeof anyEntry.lastStimulusAtUtc === "string")
    return anyEntry.lastStimulusAtUtc;
  if (typeof anyEntry.lastTrainedAtUtc === "string")
    return anyEntry.lastTrainedAtUtc;
  return null;
}

function readReadinessHours(entry: unknown): number {
  if (!entry || typeof entry !== "object") return 72;
  const raw = Number((entry as any).readinessHours);
  if (!Number.isFinite(raw) || raw <= 0) return 72;
  return raw;
}

function formatUtc(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (!Number.isFinite(d.getTime())) return "Ukjent";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDateOnly(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (!Number.isFinite(d.getTime())) return "Ukjent";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

type FigureSide = "front" | "back";
type PopupAnchor = { x: number; y: number };

const POPUP_WIDTH = 240;
const POPUP_HEIGHT = 138;

const SLUG_ANCHORS: Record<
  string,
  { front?: PopupAnchor; back?: PopupAnchor }
> = {
  chest: { front: { x: 0.5, y: 0.29 } },
  deltoids: { front: { x: 0.5, y: 0.25 }, back: { x: 0.5, y: 0.24 } },
  biceps: { front: { x: 0.5, y: 0.37 } },
  triceps: { back: { x: 0.5, y: 0.37 } },
  forearm: { front: { x: 0.5, y: 0.48 }, back: { x: 0.5, y: 0.48 } },
  abs: { front: { x: 0.5, y: 0.45 } },
  obliques: { front: { x: 0.5, y: 0.46 } },
  quadriceps: { front: { x: 0.5, y: 0.66 } },
  adductors: { front: { x: 0.5, y: 0.7 } },
  tibialis: { front: { x: 0.5, y: 0.84 } },
  trapezius: { back: { x: 0.5, y: 0.19 } },
  "upper-back": { back: { x: 0.5, y: 0.29 } },
  "lower-back": { back: { x: 0.5, y: 0.44 } },
  gluteal: { back: { x: 0.5, y: 0.57 } },
  hamstring: { back: { x: 0.5, y: 0.68 } },
  calves: { back: { x: 0.5, y: 0.84 } },
};

const SIDE_AWARE_SLUGS = new Set([
  "chest",
  "deltoids",
  "biceps",
  "triceps",
  "forearm",
  "obliques",
  "quadriceps",
  "adductors",
  "tibialis",
  "trapezius",
  "upper-back",
  "lower-back",
  "gluteal",
  "hamstring",
  "calves",
]);

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getBodyAnchor(
  slug: string,
  figureSide: FigureSide,
  pressedSide?: "left" | "right"
): PopupAnchor {
  const defaultAnchor =
    figureSide === "front" ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 0.46 };
  const mapped = SLUG_ANCHORS[slug]?.[figureSide] ?? defaultAnchor;
  if (!pressedSide || !SIDE_AWARE_SLUGS.has(slug)) return mapped;

  const sideX = pressedSide === "left" ? 0.35 : 0.65;
  return { x: sideX, y: mapped.y };
}

function uniq(list: HomeGoalTile[]) {
  const seen = new Set<HomeGoalTile>();
  const out: HomeGoalTile[] = [];
  for (const t of list) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

const SECTION_GAP = 18;

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const { token, setToken } = useAuth();
  const { todayTotals } = useFoodContext();
  const { progressionLast7, lastWeight } = useWeightContext();
  const {
    userSettings,
    setUserSettings,
    refreshUserSettings,
    isLoadingUserSettings,
    isSavingUserSettings,
    userSettingsError,
  } = useUserSettings();
  const { data: sessions = [] } = useCompletedWorkouts();
  const { data: exercises = [] } = useExercises();
  const { recoveryMap } = useRecoveryMap({ sessions, exercises });

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [musclePopup, setMusclePopup] = useState<{
    muscle: string;
    lastTrained: string;
    estimatedReady: string;
    anchor: PopupAnchor | null;
  } | null>(null);
  const popupAnim = useRef(new Animated.Value(0)).current;
  const [anatomyCardSize, setAnatomyCardSize] = useState({
    width: 0,
    height: 0,
  });
  const [anatomyRowLayout, setAnatomyRowLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [frontColLayout, setFrontColLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [backColLayout, setBackColLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [frontFigureLayout, setFrontFigureLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [backFigureLayout, setBackFigureLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!token) {
      setDisplayName("");
      return;
    }

    (async () => {
      try {
        const me = await fetchMyUser(token);
        if (!isActive) return;
        setDisplayName((me?.displayName ?? "").trim());
      } catch (error) {
        console.log("Could not fetch user profile", error);
        if (isActive) setDisplayName("");
      }
    })();

    return () => {
      isActive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!musclePopup) return;
    popupAnim.setValue(0);
    Animated.parallel([
      Animated.timing(popupAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [musclePopup, popupAnim]);

  const filteredRecoveryMap = useMemo(() => {
    const hidden = new Set<string>(userSettings.recoveryMapHiddenMuscles ?? []);
    const next: Record<string, (typeof recoveryMap)[string]> = {};

    for (const [muscle, entry] of Object.entries(recoveryMap ?? {})) {
      if (muscle === "ALL" || !hidden.has(muscle)) {
        next[muscle] = entry;
      }
    }

    return next;
  }, [recoveryMap, userSettings.recoveryMapHiddenMuscles]);

  const filteredBodyData = useMemo(
    () => toBodyHighlighterData(filteredRecoveryMap),
    [filteredRecoveryMap]
  );

  const recoveryBySlug = useMemo(() => {
    const map = new Map<
      string,
      {
        muscle: string;
        recovery01: number;
        lastStimulusAtUtc: string | null;
        readinessHours: number;
      }[]
    >();

    for (const [muscle, entry] of Object.entries(filteredRecoveryMap ?? {})) {
      if (muscle === "ALL") continue;
      const slug = muscleToSlug(muscle);
      if (!slug) continue;

      const current = map.get(slug) ?? [];
      current.push({
        muscle,
        recovery01: readRecovery01(entry),
        lastStimulusAtUtc: readLastStimulusAtUtc(entry),
        readinessHours: readReadinessHours(entry),
      });
      map.set(slug, current);
    }

    return map;
  }, [filteredRecoveryMap]);

  const popupPositionStyle = useMemo(() => {
    if (
      !musclePopup?.anchor ||
      anatomyCardSize.width <= 0 ||
      anatomyCardSize.height <= 0
    ) {
      return {
        position: "relative" as const,
        marginTop: 8,
      };
    }

    const safePad = 8;
    const preferredTop = musclePopup.anchor.y - POPUP_HEIGHT - 14;
    const canShowAbove = preferredTop >= 44;
    const fallbackTop = musclePopup.anchor.y + 14;
    const top = canShowAbove
      ? preferredTop
      : clamp(fallbackTop, 44, anatomyCardSize.height - POPUP_HEIGHT - safePad);

    const left = clamp(
      musclePopup.anchor.x - POPUP_WIDTH / 2,
      safePad,
      anatomyCardSize.width - POPUP_WIDTH - safePad
    );

    return {
      position: "absolute" as const,
      left,
      top,
      width: POPUP_WIDTH,
    };
  }, [anatomyCardSize.height, anatomyCardSize.width, musclePopup?.anchor]);

  const handleBodyPartPress = useCallback(
    (
      bodyPart: { slug?: string },
      figureSide: FigureSide,
      pressedSide?: "left" | "right"
    ) => {
      const slug = bodyPart?.slug;
      if (!slug) return;

      const figureLayout =
        figureSide === "front" ? frontFigureLayout : backFigureLayout;
      const colLayout = figureSide === "front" ? frontColLayout : backColLayout;
      const normalizedAnchor = getBodyAnchor(slug, figureSide, pressedSide);

      const anchor =
        figureLayout && colLayout && anatomyRowLayout
          ? {
              x:
                anatomyRowLayout.x +
                colLayout.x +
                figureLayout.x +
                normalizedAnchor.x * figureLayout.width,
              y:
                anatomyRowLayout.y +
                colLayout.y +
                figureLayout.y +
                normalizedAnchor.y * figureLayout.height,
            }
          : null;

      const candidates = recoveryBySlug.get(slug) ?? [];
      if (candidates.length === 0) {
        setMusclePopup({
          muscle: slug,
          lastTrained: "Ingen data",
          estimatedReady: "Ingen data",
          anchor,
        });
        return;
      }

      const selected = [...candidates].sort(
        (a, b) => a.recovery01 - b.recovery01
      )[0];
      const lastTrained = selected.lastStimulusAtUtc
        ? formatUtc(selected.lastStimulusAtUtc)
        : "Ingen data";

      let estimatedReady = "Ingen data";
      if (selected.lastStimulusAtUtc) {
        const trainedAtMs = Date.parse(selected.lastStimulusAtUtc);
        if (Number.isFinite(trainedAtMs)) {
          const readyAt = new Date(
            trainedAtMs + selected.readinessHours * 60 * 60 * 1000
          );
          estimatedReady = formatDateOnly(readyAt.toISOString());
        }
      }

      setMusclePopup({
        muscle: selected.muscle,
        lastTrained,
        estimatedReady,
        anchor,
      });
    },
    [
      anatomyRowLayout,
      backColLayout,
      backFigureLayout,
      frontColLayout,
      frontFigureLayout,
      recoveryBySlug,
    ]
  );

  // Tiles valgt i settings
  const enabledTiles = useMemo(() => {
    const raw = userSettings.homeGoalTiles ?? [];
    return uniq(raw).filter((t) => ALL_TILES.includes(t));
  }, [userSettings.homeGoalTiles]);

  const topKey: HomeGoalTile | null = enabledTiles.includes("calories")
    ? "calories"
    : null;

  const bottomKeys = useMemo(
    () => enabledTiles.filter((t) => t !== "calories").slice(0, 3),
    [enabledTiles]
  );

  const bottomCount = bottomKeys.length;

  const tileData = useMemo(() => {
    const calories = Number(todayTotals.totalCalories ?? 0);
    const proteins = Number(todayTotals.totalProteins ?? 0);
    const carbs = Number(todayTotals.totalCarbs ?? 0);
    const fats = Number(todayTotals.totalFats ?? 0);

    const calorieGoal = Number(userSettings.calorieGoal ?? 0);
    const proteinGoal = Number(userSettings.proteinGoal ?? 0);
    const carbGoal = Number(userSettings.carbGoal ?? 0);
    const fatGoal = Number(userSettings.fatGoal ?? 0);

    return {
      calories: {
        current: calories,
        max: calorieGoal,
        pct: calcPct(calories, calorieGoal),
      },
      protein: {
        current: proteins,
        max: proteinGoal,
        pct: calcPct(proteins, proteinGoal),
      },
      carbs: { current: carbs, max: carbGoal, pct: calcPct(carbs, carbGoal) },
      fat: { current: fats, max: fatGoal, pct: calcPct(fats, fatGoal) },
    };
  }, [todayTotals, userSettings]);

  const logOutUser = async () => {
    await setToken(null);
    router.replace("/(auth)/sign-in");
  };

  const deleteUserAccount = async () => {
    if (!token) {
      throw new Error("Du er ikke logget inn.");
    }

    await deleteMyUser(token);
    await setToken(null);
    router.replace("/(auth)/sign-in");
  };

  const orderedHomeSections = normalizeHomeSectionOrder(
    userSettings.homeSectionOrder
  );

  const homeSections: Array<{ key: HomeSectionKey; content: React.ReactNode }> = [];

  for (const sectionKey of orderedHomeSections) {
    if (sectionKey === "quickStart") {
      homeSections.push({
        key: sectionKey,
        content: <QuickStartButtons />,
      });
      continue;
    }

    if (sectionKey === "goals") {
      if (!topKey && bottomKeys.length === 0) continue;

      homeSections.push({
        key: sectionKey,
        content: (
          <View style={[generalStyles.newCard, styles.goalsCard]}>
            <View pointerEvents="none" style={styles.goalsSheenWrap}>
              <LinearGradient
                colors={[
                  "rgba(6,182,212,0.14)",
                  "rgba(59,130,246,0.09)",
                  "rgba(2,6,23,0.00)",
                ]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.goalsSheen}
              />
            </View>

            <LinearGradient
              colors={["rgba(6,182,212,0.88)", "rgba(59,130,246,0.84)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.goalsAccentBar}
            />
            <View style={styles.goalsHeader}>
              <Text style={[typography.body, styles.goalsTitle]}>Dagens mål</Text>
            </View>

            {topKey && (
              <View style={styles.topArea}>
                <ProgressCircle
                  percentage={tileData.calories.pct}
                  currentValue={tileData.calories.current}
                  maxValue={tileData.calories.max}
                  size={130}
                  strokeWidth={5}
                  accentColor={circleAccents.calories}
                  icon={
                    <Ionicons
                      name="flame-outline"
                      size={18}
                      color={circleAccents.calories as any}
                    />
                  }
                  labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                  valueStyle={styles.circleValueTop}
                  fractionStyle={styles.circleFractionTop}
                />

                <Text style={[typography.body, styles.topLabel]} numberOfLines={1}>
                  {labelMap.calories}
                </Text>
              </View>
            )}

            {bottomKeys.length > 0 && (
              <View
                style={[
                  styles.bottomRow,
                  bottomCount === 1 && styles.bottomRow1,
                  bottomCount === 2 && styles.bottomRow2,
                  bottomCount === 3 && styles.bottomRow3,
                ]}
              >
                {bottomKeys.map((k) => {
                  const it = tileData[k];
                  return (
                    <View
                      key={k}
                      style={[
                        styles.bottomTile,
                        bottomCount === 1 && styles.bottomTile1,
                        bottomCount === 2 && styles.bottomTile2,
                        bottomCount === 3 && styles.bottomTile3,
                      ]}
                    >
                      <ProgressCircle
                        percentage={it.pct}
                        currentValue={it.current}
                        maxValue={it.max}
                        size={95}
                        strokeWidth={6}
                        accentColor={circleAccents[k]}
                        labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                        valueStyle={styles.circleValue}
                        fractionStyle={styles.circleFraction}
                      />

                      <Text style={[typography.body, styles.macroLabel]} numberOfLines={1}>
                        {shortLabelMap[k]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ),
      });
      continue;
    }

    if (sectionKey === "weight") {
      homeSections.push({
        key: sectionKey,
        content: (
          <WeightSummaryBox
            weightProgressLastWeek={progressionLast7}
            todayWeight={lastWeight ?? 0}
          />
        ),
      });
      continue;
    }

    homeSections.push({
      key: sectionKey,
      content: (
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.06)",
            "rgba(255,255,255,0.03)",
            "rgba(255,255,255,0.02)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.anatomyCard}
          onLayout={(e) =>
            setAnatomyCardSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <View style={styles.anatomyInnerStroke} />

          <LinearGradient
            colors={[
              "rgba(6,182,212,0.12)",
              "rgba(59,130,246,0.10)",
              "rgba(2,6,23,0.00)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.anatomyGlow}
          />

          <View style={styles.anatomyHeader}>
            <Text style={[typography.body, styles.anatomyTitle]}>Restitusjonskart</Text>
          </View>

          <LinearGradient
            colors={["rgba(6,182,212,0.88)", "rgba(59,130,246,0.84)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.anatomyAccentBar}
          />

          <View
            style={styles.anatomyRow}
            onLayout={(e) => setAnatomyRowLayout(e.nativeEvent.layout)}
          >
            <View
              style={styles.anatomyCol}
              onLayout={(e) => setFrontColLayout(e.nativeEvent.layout)}
            >
              <View style={styles.anatomyLabelPill}>
                <Text style={styles.anatomyLabelText}>Forside</Text>
              </View>

              <View
                style={styles.anatomyFigureBox}
                onLayout={(e) => setFrontFigureLayout(e.nativeEvent.layout)}
              >
                <AnatomyFigure
                  gender="male"
                  side="front"
                  scale={1.08}
                  offsetY={24}
                  outline="subtle"
                  data={filteredBodyData}
                  onBodyPartPress={(part, side) =>
                    handleBodyPartPress(part, "front", side)
                  }
                />
              </View>
            </View>

            <View style={styles.anatomyDivider} />

            <View
              style={styles.anatomyCol}
              onLayout={(e) => setBackColLayout(e.nativeEvent.layout)}
            >
              <View style={styles.anatomyLabelPill}>
                <Text style={styles.anatomyLabelText}>Bakside</Text>
              </View>

              <View
                style={styles.anatomyFigureBox}
                onLayout={(e) => setBackFigureLayout(e.nativeEvent.layout)}
              >
                <AnatomyFigure
                  gender="male"
                  side="back"
                  scale={1.08}
                  offsetY={24}
                  outline="subtle"
                  data={filteredBodyData}
                  onBodyPartPress={(part, side) =>
                    handleBodyPartPress(part, "back", side)
                  }
                />
              </View>
            </View>
          </View>

          {musclePopup && (
            <Animated.View
              style={[
                styles.musclePopupShell,
                popupPositionStyle,
                {
                  opacity: popupAnim,
                  transform: [
                    {
                      translateY: popupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                    {
                      scale: popupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.musclePopup}>
                <LinearGradient
                  colors={[
                    "rgba(56,189,248,0.24)",
                    "rgba(99,102,241,0.18)",
                    "rgba(2,6,23,0.84)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.musclePopupGlow}
                />

                <View style={styles.musclePopupHeader}>
                  <View style={styles.musclePopupTitleRow}>
                    <View style={styles.musclePopupDot} />
                    <Text style={styles.musclePopupTitle}>{musclePopup.muscle}</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.musclePopupClose,
                      pressed && styles.musclePopupClosePressed,
                    ]}
                    onPress={() => setMusclePopup(null)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close" size={13} color="rgba(226,232,240,0.92)" />
                  </Pressable>
                </View>

                <View style={styles.musclePopupMetricRow}>
                  <View style={styles.musclePopupMetricLabel}>
                    <Ionicons name="time-outline" size={12} color="rgba(148,163,184,0.95)" />
                    <Text style={styles.musclePopupMetricLabelText}>Sist trent</Text>
                  </View>
                  <Text style={styles.musclePopupMetricValue}>{musclePopup.lastTrained}</Text>
                </View>

                <View style={styles.musclePopupMetricRow}>
                  <View style={styles.musclePopupMetricLabel}>
                    <Ionicons name="sparkles-outline" size={12} color="rgba(148,163,184,0.95)" />
                    <Text style={styles.musclePopupMetricLabelText}>Estimert klar</Text>
                  </View>
                  <Text style={[styles.musclePopupMetricValue, styles.musclePopupMetricValueReady]}>
                    {musclePopup.estimatedReady}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
        </LinearGradient>
      ),
    });
  }
  return (
    <DarkOceanBackground
      style={[styles.screen, { paddingTop: insets.top + 6 }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text
              style={[typography.h2, { marginBottom: 5 }]}
              numberOfLines={1}
            >
              {displayName
                ? `Velkommen tilbake, ${displayName}`
                : "Velkommen tilbake"}
            </Text>
            <Text style={[typography.body, styles.subGreeting]}>
              Klar for neste progresjon i dag?
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.settingsIconWrap}>
              <SettingsLogo height={22} width={22} />
            </View>
          </TouchableOpacity>
        </View>

        {homeSections.map((section, index) => (
          <View
            key={section.key}
            style={
              index === homeSections.length - 1 ? styles.sectionLast : styles.section
            }
          >
            {section.content}
          </View>
        ))}
      </ScrollView>

      <SettingsModal
        visible={settingsVisible}
        setVisible={setSettingsVisible}
        userSettings={userSettings}
        onChangeUserSettings={setUserSettings}
        onRefreshUserSettings={refreshUserSettings}
        isLoadingUserSettings={isLoadingUserSettings}
        isSavingUserSettings={isSavingUserSettings}
        userSettingsError={userSettingsError}
        onLogout={logOutUser}
        onDeleteAccount={deleteUserAccount}
      />
    </DarkOceanBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    paddingHorizontal: 20,
  },
  scrollContent: { paddingBottom: 24 },

  // ✅ Global, consistent vertical rhythm between sections
  section: { marginBottom: SECTION_GAP },
  sectionLast: { marginBottom: 0 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  headerLeft: { flex: 1, minWidth: 0 },

  subGreeting: {
    marginBottom: 18,
    fontSize: 14,
    fontWeight: "300",
    color: ui.muted,
  },

  settingsButton: { padding: 4 },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ui.pillBg,
    borderWidth: 1,
    borderColor: ui.pillBorder,
  },

  goalsCard: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    borderRadius: 18,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.16)",
    backgroundColor: "rgba(15,23,42,0.44)",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },

  goalsSheenWrap: {
    position: "absolute",
    top: -45,
    left: -60,
    right: -60,
    bottom: -45,
  },
  goalsSheen: {
    flex: 1,
    transform: [{ rotate: "-10deg" }],
  },

  goalsAccentBar: {
    height: 3,
    width: "48%",
    borderRadius: 999,
    opacity: 0.92,
    alignSelf: "center",
    marginBottom: 8,
  },

  goalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  goalsTitle: {
    color: ui.text,
    fontSize: 12,
    fontWeight: "400",
  },

  topArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 6,
  },
  topLabel: {
    marginTop: 6,
    color: "rgba(229,236,255,0.85)",
    fontSize: 12,
    fontWeight: "400",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },
  bottomRow1: { justifyContent: "center" },
  bottomRow2: { justifyContent: "space-between" },
  bottomRow3: { justifyContent: "space-between" },

  bottomTile: { alignItems: "center" },
  bottomTile1: { width: "100%" },
  bottomTile2: { width: "48%" },
  bottomTile3: { width: "32%" },

  macroLabel: {
    marginTop: 6,
    color: "rgba(229,236,255,0.85)",
    fontSize: 12,
    fontWeight: "400",
  },

  circleValueTop: {
    color: "rgba(255,255,255,0.96)",
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  circleFractionTop: {
    fontWeight: "500",
    opacity: 0.95,
  },

  circleValue: {
    color: "rgba(255,255,255,0.96)",
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  circleFraction: {
    fontWeight: "500",
    opacity: 0.95,
  },

  // === Anatomy card styles ===
  anatomyCard: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(15,23,42,0.44)",
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.16)",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },

  anatomyInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.12)",
  },

  anatomyGlow: {
    position: "absolute",
    top: -40,
    left: -40,
    right: -40,
    height: 220,
    borderRadius: 999,
    opacity: 0.65,
  },
  anatomyAccentBar: {
    height: 3,
    width: "48%",
    borderRadius: 999,
    opacity: 0.92,
    alignSelf: "center",
    marginBottom: 12,
  },

  anatomyHeader: {
    marginBottom: 8,
  },

  anatomyTitle: {
    color: ui.text,
    fontSize: 13,
    fontWeight: "500",
  },

  anatomyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  anatomyCol: {
    flex: 1,
    alignItems: "center",
  },

  anatomyDivider: {
    width: 1,
    backgroundColor: "rgba(59,130,246,0.16)",
    marginHorizontal: 10,
    borderRadius: 1,
  },

  anatomyLabelPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.24)",
    marginBottom: 10,
  },

  anatomyLabelText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: ui.muted,
  },

  anatomyFigureBox: {
    width: "100%",
    height: 392,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
  },

  musclePopupShell: {
    zIndex: 30,
    elevation: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  musclePopup: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  musclePopupGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  musclePopupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  musclePopupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  musclePopupDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "rgba(34,211,238,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  musclePopupTitle: {
    color: "rgba(229,236,255,0.95)",
    fontSize: 13,
    fontWeight: "700",
  },
  musclePopupClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.14)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  musclePopupClosePressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: "rgba(148,163,184,0.24)",
  },
  musclePopupMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  musclePopupMetricLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  musclePopupMetricLabelText: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  musclePopupMetricValue: {
    color: "rgba(203,213,225,0.92)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  musclePopupMetricValueReady: {
    color: "rgba(125,211,252,0.96)",
  },
  musclePopupHint: {
    marginTop: 4,
    color: "rgba(148,163,184,0.86)",
    fontSize: 11,
  },
});




