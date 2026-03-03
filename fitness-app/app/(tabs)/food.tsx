// app/(tabs)/food.tsx
import { DeleteUserMeal, PostUserMeal, UpdateUserMeal } from "@/api/food";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { AddMealButton } from "@/components/food/addMealButton";
import { AddMealSheet } from "@/components/food/addMealSheet";
import { AddMealSheetQR } from "@/components/food/addMealSheetQR";
import { EditMealSheet } from "@/components/food/EditMealSheet";
import { FoodHistory } from "@/components/food/foodHistory";
import { MealCard } from "@/components/food/mealCard";
import { ProgressCircle } from "@/components/food/progressCircle";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useFoodContext } from "@/context/FoodProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import type { Food, FoodDto } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Match HomePage accents (reference vibe)
const circleAccents = {
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
  const c = Number(current);
  const g = Number(goal);
  if (!Number.isFinite(c)) return 0;
  if (!Number.isFinite(g) || g <= 0) return 0;
  return clampPct((c / g) * 100);
}

export default function FoodPage() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "qr">("manual");

  const { token } = useAuth();
  const { userSettings } = useUserSettings();

  // ✅ Editing sheet state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Food | null>(null);

  const { todayTotals, foodList, setFoodList } = useFoodContext();

  const onClose = () => setIsOpen(false);

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingMeal(null);
  };

  const handlePostMeal = async (values: FoodDto) => {
    try {
      if (!token) return;
      const created = await PostUserMeal(token, values);
      setFoodList((prev) => [created, ...prev]);
      setIsOpen(false);
    } catch (error) {
      console.log("Could not save meal to backend", error);
      Alert.alert("Kunne ikke lagre måltid", "Noe gikk galt. Prøv igjen.");
    }
  };

  // ✅ MealCard -> "Rediger"
  const handleEditFromCard = (meal: Food) => {
    setEditingMeal(meal);
    setIsEditOpen(true);
  };

  // ✅ MealCard -> "Slett" (optimistic + rollback)
  const handleDeleteFromCard = async (mealId: string) => {
    const prev = foodList;

    // optimistic remove
    setFoodList((p) => p.filter((m) => String(m.id) !== String(mealId)));

    try {
      if (!token) return;
      await DeleteUserMeal(token, mealId);
    } catch (e) {
      console.log("DeleteUserMeal failed:", e);
      setFoodList(prev);

      Alert.alert(
        "Kunne ikke slette",
        "Noe gikk galt. Prøv igjen.",
        [{ text: "OK" }],
        { cancelable: true }
      );
    }
  };

  // ✅ Edit sheet -> submit (optimistic update + rollback)
  const handleUpdateMeal = async (mealId: string, values: FoodDto) => {
    const prev = foodList;

    // optimistic update locally (keep same id)
    setFoodList((p) =>
      p.map((m) =>
        String(m.id) === String(mealId)
          ? ({
              ...m,
              title: values.title,
              calories: values.calories,
              proteins: values.proteins,
              carbs: values.carbs,
              fats: values.fats,
              timestampUtc: values.timestampUtc,
            } as any)
          : m
      )
    );

    try {
      if (!token) return;
      const updated = await UpdateUserMeal(token, mealId, values);

      // ensure local list matches backend response (and keeps sorting)
      setFoodList((p) => {
        const next = p.map((m) =>
          String(m.id) === String(mealId) ? updated : m
        );
        // if you rely on timestamp sort:
        next.sort(
          (a: any, b: any) =>
            new Date(b.timestampUtc).getTime() -
            new Date(a.timestampUtc).getTime()
        );
        return next;
      });

      closeEdit();
    } catch (e) {
      console.log("UpdateUserMeal failed:", e);
      setFoodList(prev);

      Alert.alert(
        "Kunne ikke oppdatere",
        "Noe gikk galt. Prøv igjen.",
        [{ text: "OK" }],
        { cancelable: true }
      );
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
        {/* GOALS CARD (same vibe as Home) */}
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

          {/* TOP: Calories */}
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

          {/* BOTTOM: macros */}
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

        {/* MEALCARDS (long-press menu hooks) */}
        <MealCard
          foodList={foodList}
          onEditMeal={handleEditFromCard}
          onDeleteMeal={handleDeleteFromCard}
        />

        {/* FOOD HISTORY */}
        <FoodHistory foodList={foodList} />
      </ScrollView>

      {/* FOOTER: BUTTON */}
      <View style={styles.footerContainer}>
        {!isOpen && (
          <AddMealButton onPress={() => setIsOpen(true)} key="add-button" />
        )}
      </View>

      {/* SHEETS */}
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

      {/* ✅ EDIT SHEET */}
      <EditMealSheet
        isOpen={isEditOpen}
        onClose={closeEdit}
        meal={editingMeal}
        onSubmit={handleUpdateMeal}
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
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
});
