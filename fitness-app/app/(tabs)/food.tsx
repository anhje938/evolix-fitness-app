import {
  CreateComposedMeal,
  DeleteComposedMeal,
  DeleteUserMeal,
  FetchComposedMealHistory,
  FetchComposedMeals,
  LogComposedMeal,
  PostUserMeal,
  RelogComposedMealFromHistory,
  SetComposedMealFavorite,
  UpdateComposedMeal as UpdateComposedMealApi,
  UpdateUserMeal,
} from "@/api/food";
import { BodyGoalCoachCard } from "@/components/coaching/BodyGoalCoachCard";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { AddMealButton } from "@/components/food/addMealButton";
import { AddMealSheet } from "@/components/food/addMealSheet";
import { AddMealSheetQR } from "@/components/food/addMealSheetQR";
import { ComposedMealEditorSheet } from "@/components/food/ComposedMealEditorSheet";
import { ComposedMealLogSheet } from "@/components/food/ComposedMealLogSheet";
import { ComposedMealsSection } from "@/components/food/composedMealsSection";
import { EditMealSheet } from "@/components/food/EditMealSheet";
import { FoodHistory } from "@/components/food/foodHistory";
import { MealCard } from "@/components/food/mealCard";
import { ProgressCircle } from "@/components/food/progressCircle";
import { floatingActionButtonDock } from "@/config/floatingActionButton";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useFoodContext } from "@/context/FoodProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWeightContext } from "@/context/WeightProvider";
import type {
  ComposedMeal,
  ComposedMealHistoryItem,
  Food,
  FoodDto,
  UpsertComposedMealDto,
} from "@/types/meal";
import { buildBodyGoalCoach } from "@/utils/coaching/bodyGoalCoach";
import { parseDateKey } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const circleAccents = {
  calories: "rgba(255,159,28,1)",
  protein: "rgba(168,85,247,1)",
  carbs: "rgba(6,182,212,1)",
  fat: "rgba(34,197,94,1)",
};

type LogSheetTarget = {
  meal: ComposedMeal;
  defaultServings: number;
};

function clampPct(p: number) {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(160, p));
}

function calcPct(current: number, goal: number) {
  const c = Number(current);
  const g = Number(goal);
  if (!Number.isFinite(c)) return 0;
  if (!Number.isFinite(g) || g <= 0) return 0;
  return clampPct((c / g) * 100);
}

function sortFoodsByTimestampDesc(list: Food[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.timestampUtc).getTime() - new Date(a.timestampUtc).getTime()
  );
}

function normalizeExcludedDateKeys(dateKeys: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const raw of dateKeys) {
    const dateKey = String(raw ?? "").trim();
    if (!parseDateKey(dateKey)) continue;
    if (seen.has(dateKey)) continue;

    seen.add(dateKey);
    next.push(dateKey);
  }

  return next.sort();
}

export default function FoodPage() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "qr">("manual");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Food | null>(null);

  const [composedMeals, setComposedMeals] = useState<ComposedMeal[]>([]);
  const [composedHistory, setComposedHistory] = useState<
    ComposedMealHistoryItem[]
  >([]);
  const [isLoadingComposedMeals, setIsLoadingComposedMeals] = useState(false);

  const [isComposedEditorOpen, setIsComposedEditorOpen] = useState(false);
  const [editingComposedMeal, setEditingComposedMeal] =
    useState<ComposedMeal | null>(null);
  const [logSheetTarget, setLogSheetTarget] = useState<LogSheetTarget | null>(
    null
  );

  const { token } = useAuth();
  const { userSettings, setUserSettings } = useUserSettings();
  const { todayTotals, foodList, setFoodList, refreshMeals } = useFoodContext();
  const { weightList } = useWeightContext();

  const foodCoach = useMemo(
    () => {
      if (!userSettings.useFoodCoach) return null;

      return buildBodyGoalCoach({
        weightList,
        foodList,
        userSettings,
      });
    },
    [foodList, userSettings, weightList]
  );

  const handleToggleFoodCoachDate = useCallback(
    (dateKey: string) => {
      if (!parseDateKey(dateKey)) return;

      const current = userSettings.foodCoachExcludedDateKeys ?? [];
      const next = current.includes(dateKey)
        ? current.filter((item) => item !== dateKey)
        : [...current, dateKey];

      setUserSettings({
        ...userSettings,
        foodCoachExcludedDateKeys: normalizeExcludedDateKeys(next),
      });
    },
    [setUserSettings, userSettings]
  );

  const onClose = () => setIsOpen(false);

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingMeal(null);
  };

  const closeComposedEditor = () => {
    setIsComposedEditorOpen(false);
    setEditingComposedMeal(null);
  };

  const closeLogSheet = () => {
    setLogSheetTarget(null);
  };

  const refreshComposedData = useCallback(async () => {
    if (!token) {
      setComposedMeals([]);
      setComposedHistory([]);
      return;
    }

    setIsLoadingComposedMeals(true);
    try {
      const [meals, history] = await Promise.all([
        FetchComposedMeals(token),
        FetchComposedMealHistory(token, 25),
      ]);
      setComposedMeals(meals);
      setComposedHistory(history);
    } catch (error) {
      console.log("Could not load composed meals", error);
    } finally {
      setIsLoadingComposedMeals(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshComposedData();
  }, [refreshComposedData]);

  const appendLoggedFood = (created: Food) => {
    setFoodList((prev) => sortFoodsByTimestampDesc([created, ...prev]));
  };

  const handlePostMeal = async (values: FoodDto) => {
    try {
      if (!token) return;
      const created = await PostUserMeal(token, {
        ...values,
        sourceType: values.sourceType ?? (mode === "qr" ? "qr" : "quickAdd"),
      });
      appendLoggedFood(created);
      void refreshMeals();
      setIsOpen(false);
    } catch (error) {
      console.log("Could not save meal to backend", error);
      Alert.alert("Kunne ikke lagre måltid", "Noe gikk galt. Prøv igjen.");
    }
  };

  const handleEditFromCard = async (meal: Food) => {
    const composedMealId =
      meal.sourceType === "composedMeal" && meal.sourceComposedMealId
        ? String(meal.sourceComposedMealId)
        : null;

    if (composedMealId) {
      let target =
        composedMeals.find((x) => String(x.id) === composedMealId) ?? null;

      if (!target && token) {
        try {
          const latestMeals = await FetchComposedMeals(token);
          setComposedMeals(latestMeals);
          target =
            latestMeals.find((x) => String(x.id) === composedMealId) ?? null;
        } catch (error) {
          console.log("Could not refresh composed meals before edit", error);
        }
      }

      if (target) {
        closeEdit();
        setEditingComposedMeal(target);
        setIsComposedEditorOpen(true);
        return;
      }

      Alert.alert(
        "Kunne ikke åpne retten",
        "Denne måltidsloggen kommer fra en rett som ikke ble funnet. Den kan være slettet."
      );
      return;
    }

    closeComposedEditor();
    setEditingMeal(meal);
    setIsEditOpen(true);
  };

  const handleDeleteFromCard = async (mealId: string) => {
    const prev = foodList;

    setFoodList((p) => p.filter((m) => String(m.id) !== String(mealId)));

    try {
      if (!token) return;
      await DeleteUserMeal(token, mealId);
      void refreshMeals();
    } catch (e) {
      console.log("DeleteUserMeal failed:", e);
      setFoodList(prev);

      Alert.alert("Kunne ikke slette", "Noe gikk galt. Prøv igjen.", [
        { text: "OK" },
      ]);
    }
  };

  const handleUpdateMeal = async (mealId: string, values: FoodDto) => {
    const prev = foodList;

    setFoodList((p) =>
      sortFoodsByTimestampDesc(
        p.map((m) =>
          String(m.id) === String(mealId)
            ? {
                ...m,
                title: values.title,
                calories: values.calories,
                proteins: values.proteins,
                carbs: values.carbs,
                fats: values.fats,
                timestampUtc: values.timestampUtc,
              }
            : m
        )
      )
    );

    try {
      if (!token) {
        closeEdit();
        return;
      }
      const updated = await UpdateUserMeal(token, mealId, values);
      setFoodList((p) =>
        sortFoodsByTimestampDesc(
          p.map((m) => (String(m.id) === String(mealId) ? updated : m))
        )
      );
      void refreshMeals();
      closeEdit();
    } catch (e) {
      console.log("UpdateUserMeal failed:", e);
      setFoodList(prev);

      Alert.alert("Kunne ikke oppdatere", "Noe gikk galt. Prøv igjen.", [
        { text: "OK" },
      ]);
    }
  };

  const openCreateComposedMeal = () => {
    setEditingComposedMeal(null);
    setIsComposedEditorOpen(true);
  };

  const openEditComposedMeal = (meal: ComposedMeal) => {
    setEditingComposedMeal(meal);
    setIsComposedEditorOpen(true);
  };

  const handleSaveComposedMeal = async (dto: UpsertComposedMealDto) => {
    try {
      if (!token) return;
      if (editingComposedMeal) {
        await UpdateComposedMealApi(token, String(editingComposedMeal.id), dto);
      } else {
        await CreateComposedMeal(token, dto);
      }
      closeComposedEditor();
      await refreshComposedData();
    } catch (error) {
      console.log("Could not save composed meal", error);
      Alert.alert(
        "Kunne ikke lagre rett",
        "Sjekk ingrediensene og prøv igjen."
      );
    }
  };

  const handleDeleteComposedMeal = (meal: ComposedMeal) => {
    Alert.alert(
      "Slette retten?",
      `Rett "${meal.name}" blir slettet permanent.`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            try {
              if (!token) return;
              await DeleteComposedMeal(token, String(meal.id));
              setComposedMeals((prev) =>
                prev.filter((x) => String(x.id) !== String(meal.id))
              );
              setComposedHistory((prev) =>
                prev.filter((x) => String(x.composedMealId) !== String(meal.id))
              );
              if (String(logSheetTarget?.meal?.id) === String(meal.id)) {
                closeLogSheet();
              }
              await refreshComposedData();
            } catch (error) {
              console.log("Could not delete composed meal", error);
              Alert.alert("Kunne ikke slette rett", "Prøv igjen.");
            }
          },
        },
      ]
    );
  };

  const handleToggleFavoriteComposedMeal = async (meal: ComposedMeal) => {
    if (!token) return;
    const prev = composedMeals;
    setComposedMeals((list) =>
      list.map((x) =>
        String(x.id) === String(meal.id)
          ? { ...x, isFavorite: !x.isFavorite }
          : x
      )
    );
    try {
      const updated = await SetComposedMealFavorite(
        token,
        String(meal.id),
        !meal.isFavorite
      );
      setComposedMeals((list) =>
        list.map((x) => (String(x.id) === String(meal.id) ? updated : x))
      );
      await refreshComposedData();
    } catch (error) {
      console.log("Could not toggle favorite", error);
      setComposedMeals(prev);
      Alert.alert("Kunne ikke oppdatere favoritt", "Prøv igjen.");
    }
  };

  const openLogSheetForComposedMeal = (meal: ComposedMeal, servings = 1) => {
    setLogSheetTarget({
      meal,
      defaultServings: servings > 0 ? servings : 1,
    });
  };

  const handleSubmitLogSheet = async (payload: {
    servings: number;
    timestampUtc: string;
    totals: {
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
    };
    isCustomized: boolean;
  }) => {
    try {
      if (!token || !logSheetTarget) return;
      const created = payload.isCustomized
        ? await PostUserMeal(token, {
            title: logSheetTarget.meal.name,
            calories: Math.round(payload.totals.calories),
            proteins: Math.round(payload.totals.proteins),
            carbs: Math.round(payload.totals.carbs),
            fats: Math.round(payload.totals.fats),
            timestampUtc: payload.timestampUtc,
            sourceType: "manual",
          })
        : await LogComposedMeal(token, String(logSheetTarget.meal.id), {
            servings: payload.servings,
            timestampUtc: payload.timestampUtc,
          });
      appendLoggedFood(created);
      void refreshMeals();
      closeLogSheet();
      if (!payload.isCustomized) {
        await refreshComposedData();
      }
    } catch (error) {
      console.log("Could not log composed meal (custom)", error);
      Alert.alert("Kunne ikke logge rett", "Prøv igjen.");
    }
  };

  const handleRelogSameFromHistory = async (item: ComposedMealHistoryItem) => {
    try {
      if (!token) return;
      const created = await RelogComposedMealFromHistory(
        token,
        item.foodLogId,
        {}
      );
      appendLoggedFood(created);
      void refreshMeals();
      await refreshComposedData();
    } catch (error) {
      console.log("Could not relog from history", error);
      Alert.alert("Kunne ikke logge på nytt", "Prøv igjen.");
    }
  };

  const calories = Number(todayTotals.totalCalories ?? 0);
  const carbs = Number(todayTotals.totalCarbs ?? 0);
  const proteins = Number(todayTotals.totalProteins ?? 0);
  const fats = Number(todayTotals.totalFats ?? 0);

  const calorieGoal = Number(userSettings.calorieGoal ?? 0);
  const carbGoal = Number(userSettings.carbGoal ?? 0);
  const proteinGoal = Number(userSettings.proteinGoal ?? 0);
  const fatGoal = Number(userSettings.fatGoal ?? 0);

  return (
    <DarkOceanBackground
      style={[styles.screen, { paddingTop: insets.top + 6 }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

          <View style={styles.header}>
            <Text style={[typography.body, styles.headerTitle]}>
              Dagens mål
            </Text>
          </View>

          <View style={styles.topArea}>
            <ProgressCircle
              percentage={calcPct(calories, calorieGoal)}
              currentValue={calories}
              maxValue={calorieGoal}
              size={150}
              strokeWidth={6}
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
              Kalorier
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.bottomTile}>
              <ProgressCircle
                percentage={calcPct(carbs, carbGoal)}
                currentValue={carbs}
                maxValue={carbGoal}
                size={111}
                strokeWidth={7}
                accentColor={circleAccents.carbs}
                labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                valueStyle={styles.circleValue}
                fractionStyle={styles.circleFraction}
              />
              <Text
                style={[typography.body, styles.macroLabel]}
                numberOfLines={1}
              >
                Karbo
              </Text>
            </View>

            <View style={styles.bottomTile}>
              <ProgressCircle
                percentage={calcPct(proteins, proteinGoal)}
                currentValue={proteins}
                maxValue={proteinGoal}
                size={111}
                strokeWidth={7}
                accentColor={circleAccents.protein}
                labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                valueStyle={styles.circleValue}
                fractionStyle={styles.circleFraction}
              />
              <Text
                style={[typography.body, styles.macroLabel]}
                numberOfLines={1}
              >
                Protein
              </Text>
            </View>

            <View style={styles.bottomTile}>
              <ProgressCircle
                percentage={calcPct(fats, fatGoal)}
                currentValue={fats}
                maxValue={fatGoal}
                size={111}
                strokeWidth={7}
                accentColor={circleAccents.fat}
                labelStyle={{ opacity: 0, height: 0, marginTop: 0 }}
                valueStyle={styles.circleValue}
                fractionStyle={styles.circleFraction}
              />
              <Text
                style={[typography.body, styles.macroLabel]}
                numberOfLines={1}
              >
                Fett
              </Text>
            </View>
          </View>
        </View>

        {userSettings.useFoodCoach && foodCoach ? (
          <BodyGoalCoachCard recommendation={foodCoach} variant="food" />
        ) : null}

        <MealCard
          foodList={foodList}
          onEditMeal={handleEditFromCard}
          onDeleteMeal={handleDeleteFromCard}
        />

        <ComposedMealsSection
          meals={composedMeals}
          history={composedHistory}
          isLoading={isLoadingComposedMeals}
          onCreate={openCreateComposedMeal}
          onEdit={openEditComposedMeal}
          onDelete={handleDeleteComposedMeal}
          onToggleFavorite={handleToggleFavoriteComposedMeal}
          onOpenLogSheet={openLogSheetForComposedMeal}
        />

        <FoodHistory
          foodList={foodList}
          excludedFoodCoachDateKeys={userSettings.foodCoachExcludedDateKeys}
          onToggleFoodCoachDate={handleToggleFoodCoachDate}
        />
      </ScrollView>

      <View pointerEvents="box-none" style={styles.footerContainer}>
        {!isOpen && (
          <AddMealButton onPress={() => setIsOpen(true)} key="add-button" />
        )}
      </View>

      {isOpen && mode === "manual" && (
        <AddMealSheet
          mode={mode}
          setMode={setMode}
          isOpen={isOpen}
          onClose={onClose}
          onSubmit={handlePostMeal}
        />
      )}

      {isOpen && mode === "qr" && (
        <AddMealSheetQR
          onScanned={() => {}}
          mode={mode}
          setMode={setMode}
          isOpen={isOpen}
          onClose={onClose}
          onSubmit={handlePostMeal}
          key="qr"
        />
      )}

      <EditMealSheet
        isOpen={isEditOpen}
        onClose={closeEdit}
        meal={editingMeal}
        onSubmit={handleUpdateMeal}
      />

      <ComposedMealEditorSheet
        isOpen={isComposedEditorOpen}
        initialMeal={editingComposedMeal}
        onClose={closeComposedEditor}
        onSubmit={handleSaveComposedMeal}
      />

      <ComposedMealLogSheet
        isOpen={!!logSheetTarget}
        meal={logSheetTarget?.meal ?? null}
        defaultServings={logSheetTarget?.defaultServings ?? 1}
        onClose={closeLogSheet}
        onSubmit={handleSubmitLogSheet}
      />
    </DarkOceanBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    paddingHorizontal: 20,
  },
  content: {
    paddingBottom: 40,
    width: "100%",
  },
  sectionIntro: {
    width: "100%",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubTitle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(148,163,184,0.92)",
  },
  goalsCard: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    marginBottom: 18,
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
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
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  headerTitle: {
    color: "rgba(229,236,255,0.95)",
    fontSize: 13,
    fontWeight: "400",
  },
  topArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  topLabel: {
    marginTop: 10,
    color: "rgba(229,236,255,0.85)",
    fontSize: 13,
    fontWeight: "400",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 2,
  },
  bottomTile: {
    width: "32%",
    alignItems: "center",
  },
  macroLabel: {
    marginTop: 10,
    color: "rgba(229,236,255,0.85)",
    fontSize: 13,
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
  footerContainer: {
    ...floatingActionButtonDock,
  },
});
