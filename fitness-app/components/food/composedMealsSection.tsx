import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { ComposedMeal, ComposedMealHistoryItem } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ComposedMealsSectionProps = {
  meals: ComposedMeal[];
  history: ComposedMealHistoryItem[];
  isLoading?: boolean;
  onCreate: () => void;
  onEdit: (meal: ComposedMeal) => void;
  onDelete: (meal: ComposedMeal) => void;
  onToggleFavorite: (meal: ComposedMeal) => void;
  onOpenLogSheet: (meal: ComposedMeal, servings: number) => void;
};

function toSafeMacroNumber(value: unknown): number {
  const normalized =
    typeof value === "string" ? value.replace(",", ".") : value;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function getMacroDistribution(meal: ComposedMeal) {
  const proteins = toSafeMacroNumber(meal.totalProteins);
  const carbs = toSafeMacroNumber(meal.totalCarbs);
  const fats = toSafeMacroNumber(meal.totalFats);
  const total = proteins + carbs + fats;

  if (total <= 0) {
    return { proteinPercent: 0, carbsPercent: 0, fatsPercent: 0 };
  }

  const proteinPercent = (proteins / total) * 100;
  const carbsPercent = (carbs / total) * 100;
  const fatsPercent = Math.max(0, 100 - proteinPercent - carbsPercent);

  return { proteinPercent, carbsPercent, fatsPercent };
}

function formatScaledValue(value: number) {
  const safe = toSafeMacroNumber(value);
  const rounded = Math.round(safe);
  if (Math.abs(safe - rounded) < 0.05) return String(rounded);
  return safe.toFixed(1).replace(".", ",");
}

export function ComposedMealsSection({
  meals,
  history,
  isLoading = false,
  onCreate,
  onEdit,
  onDelete,
  onToggleFavorite,
  onOpenLogSheet,
}: ComposedMealsSectionProps) {
  const [detailsMeal, setDetailsMeal] = useState<ComposedMeal | null>(null);

  const mealIds = useMemo(
    () => new Set(meals.map((meal) => String(meal.id))),
    [meals]
  );

  const filteredHistory = useMemo(
    () => history.filter((item) => mealIds.has(String(item.composedMealId))),
    [history, mealIds]
  );

  const historyByMeal = useMemo(() => {
    const map = new Map<string, { count: number; lastUtc: string }>();

    for (const item of filteredHistory) {
      const key = String(item.composedMealId);
      const previous = map.get(key);

      if (!previous) {
        map.set(key, { count: 1, lastUtc: item.timestampUtc });
        continue;
      }

      const prevTime = new Date(previous.lastUtc).getTime();
      const nextTime = new Date(item.timestampUtc).getTime();

      map.set(key, {
        count: previous.count + 1,
        lastUtc: nextTime > prevTime ? item.timestampUtc : previous.lastUtc,
      });
    }

    return map;
  }, [filteredHistory]);

  const sortedMeals = useMemo(() => {
    return [...meals].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;

      const aHistory = historyByMeal.get(String(a.id));
      const bHistory = historyByMeal.get(String(b.id));
      const aLast = aHistory?.lastUtc ?? a.lastUsedUtc ?? a.updatedUtc;
      const bLast = bHistory?.lastUtc ?? b.lastUsedUtc ?? b.updatedUtc;

      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });
  }, [meals, historyByMeal]);

  const detailIngredients = useMemo(() => {
    if (!detailsMeal) return [];
    return [...(detailsMeal.ingredients ?? [])].sort(
      (a, b) => Number(a.sortOrder) - Number(b.sortOrder)
    );
  }, [detailsMeal]);

  const favoriteCount = sortedMeals.filter((x) => x.isFavorite).length;

  const openManageMenu = (meal: ComposedMeal) => {
    Alert.alert(meal.name, "Hva vil du gjøre?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Rediger", onPress: () => onEdit(meal) },
      { text: "Slett", style: "destructive", onPress: () => onDelete(meal) },
    ]);
  };

  return (
    <View style={[generalStyles.newCard, styles.card]}>
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(34,211,238,0.14)",
          "rgba(99,102,241,0.08)",
          "rgba(2,6,23,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.headerRow}>
        <View>
          <Text style={[typography.h2, styles.title]}>Matretter</Text>
          <Text style={[typography.body, styles.subtitle]}>
            Favoritter og ferdige retter for rask, presis logging
          </Text>
        </View>

        <TouchableOpacity onPress={onCreate} style={styles.createBtn}>
          <Ionicons name="add" size={16} color="#E6FFFB" />
          <Text style={[typography.bodyBlack, styles.createBtnText]}>
            Ny rett
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statsChip}>
          <Text style={styles.statsValue}>{sortedMeals.length}</Text>
          <Text style={styles.statsLabel}>lagrede retter</Text>
        </View>
        <View style={styles.statsChip}>
          <Text style={styles.statsValue}>{favoriteCount}</Text>
          <Text style={styles.statsLabel}>favoritter</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={[typography.body, styles.emptyTitle]}>
            Laster retter...
          </Text>
        </View>
      ) : sortedMeals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={22} color="#67E8F9" />
          <Text style={[typography.bodyBlack, styles.emptyTitle]}>
            Ingen retter enda
          </Text>
          <Text style={[typography.body, styles.emptySub]}>
            Lag en matrett med ingredienser, så kan du logge den på sekunder.
          </Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listTitleChip}>
              <Ionicons name="albums-outline" size={13} color="#BAE6FD" />
              <Text style={styles.listTitleText}>Rettliste</Text>
            </View>
            <Text style={styles.listHint}>Sveip sideveis</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mealList}
          >
            {sortedMeals.map((meal) => {
              const mealHistory = historyByMeal.get(String(meal.id));
              const timesLogged = mealHistory?.count ?? 0;

              const { proteinPercent, carbsPercent, fatsPercent } =
                getMacroDistribution(meal);

              return (
                <Pressable
                  key={meal.id}
                  onPress={() => setDetailsMeal(meal)}
                  style={({ pressed }) => [
                    styles.mealCard,
                    pressed && styles.mealCardPressed,
                  ]}
                >
                  {/* Left: Image Strip */}
                  <View style={styles.imageStrip}>
                    <LinearGradient
                      colors={["rgba(56,189,248,0.2)", "rgba(14,116,144,0.3)"]}
                      style={StyleSheet.absoluteFill}
                    />

                    {/* Vertical Stats Overlay */}
                    <View style={styles.verticalStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="flame" size={18} color="#FB923C" />
                        <Text style={styles.statValue}>
                          {Math.round(meal.totalCalories)}
                        </Text>
                        <Text style={styles.statLabel}>kcal</Text>
                      </View>

                      <View style={styles.statDivider} />

                      <View style={styles.statItem}>
                        <Ionicons
                          name="trending-up"
                          size={18}
                          color="#22D3EE"
                        />
                        <Text style={styles.statValue}>{timesLogged}x</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Content */}
                  <View style={styles.cardContent}>
                    {/* Header */}
                    <View style={styles.mealHeader}>
                      <View style={styles.mealNameContainer}>
                        <Text
                          numberOfLines={1}
                          style={[typography.bodyBlack, styles.mealName]}
                        >
                          {meal.name}
                        </Text>
                        <Text style={styles.metaText}>
                          {meal.ingredientCount} ingredienser · Per porsjon
                        </Text>
                      </View>

                      <View style={styles.headerActions}>
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(meal);
                          }}
                          style={styles.favoriteBtn}
                        >
                          <Ionicons
                            name={meal.isFavorite ? "star" : "star-outline"}
                            size={14}
                            color={
                              meal.isFavorite
                                ? "#FDE68A"
                                : "rgba(226,232,240,0.6)"
                            }
                          />
                        </Pressable>

                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            openManageMenu(meal);
                          }}
                          style={styles.menuBtn}
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={14}
                            color="rgba(226,232,240,0.6)"
                          />
                        </Pressable>
                      </View>
                    </View>

                    {/* Inline Macros */}
                    <View style={styles.inlineMacros}>
                      <View style={styles.macroChipProtein}>
                        <Text style={styles.macroChipLabel}>PROTEIN</Text>
                        <Text style={styles.macroChipValueProtein}>
                          {Math.round(meal.totalProteins)}g
                        </Text>
                      </View>
                      <View style={styles.macroChipCarbs}>
                        <Text style={styles.macroChipLabel}>KARBO</Text>
                        <Text style={styles.macroChipValueCarbs}>
                          {Math.round(meal.totalCarbs)}g
                        </Text>
                      </View>
                      <View style={styles.macroChipFats}>
                        <Text style={styles.macroChipLabel}>FETT</Text>
                        <Text style={styles.macroChipValueFats}>
                          {Math.round(meal.totalFats)}g
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Makrofordeling</Text>
                        <Text style={styles.lastUsedText}>
                          Brukt totalt {timesLogged} ganger
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressProtein,
                            { width: `${proteinPercent}%` },
                          ]}
                        />
                        <View
                          style={[
                            styles.progressCarbs,
                            { width: `${carbsPercent}%` },
                          ]}
                        />
                        <View
                          style={[
                            styles.progressFats,
                            { width: `${fatsPercent}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.rowActionWrap}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onOpenLogSheet(meal, 1);
                        }}
                        style={[styles.actionBtn, styles.primaryAction]}
                      >
                        <Ionicons
                          name="checkmark-outline"
                          size={14}
                          color="#E6FFFB"
                        />
                        <Text style={styles.primaryActionText}>Logg nå</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setDetailsMeal(meal);
                        }}
                        style={styles.actionBtn}
                      >
                        <Text style={styles.actionText}>Detaljer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Modal
        transparent
        visible={!!detailsMeal}
        animationType="fade"
        onRequestClose={() => setDetailsMeal(null)}
      >
        <View style={styles.confirmOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDetailsMeal(null)}
          />

          <View style={[generalStyles.newCard, styles.detailsPopup]}>
            <LinearGradient
              pointerEvents="none"
              colors={[
                "rgba(34,211,238,0.24)",
                "rgba(59,130,246,0.12)",
                "rgba(2,6,23,0)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <LinearGradient
              pointerEvents="none"
              colors={[
                "rgba(34,211,238,0.86)",
                "rgba(56,189,248,0.72)",
                "rgba(2,6,23,0)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmTopAccent}
            />

            <View style={styles.confirmBadge}>
              <Ionicons name="sparkles-outline" size={13} color="#E6FFFB" />
              <Text style={styles.confirmBadgeText}>Klar for logging</Text>
            </View>

            <View style={styles.detailsHeader}>
              <Text
                numberOfLines={2}
                style={[typography.bodyBlack, styles.detailsTitle]}
              >
                {detailsMeal?.name}
              </Text>

              <TouchableOpacity
                onPress={() => setDetailsMeal(null)}
                style={styles.detailsCloseBtn}
              >
                <Ionicons name="close" size={16} color="#E2E8F0" />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailsSubTitle}>Næringsinnhold</Text>

            <View style={styles.detailsMacroGrid}>
              <View style={styles.detailsMacroChip}>
                <Text style={styles.detailsMacroLabel}>Kcal</Text>
                <Text style={styles.detailsMacroValue}>
                  {Math.round(Number(detailsMeal?.totalCalories || 0))}
                </Text>
              </View>
              <View style={styles.detailsMacroChip}>
                <Text style={styles.detailsMacroLabel}>Protein</Text>
                <Text style={styles.detailsMacroValue}>
                  {Math.round(Number(detailsMeal?.totalProteins || 0))} g
                </Text>
              </View>
              <View style={styles.detailsMacroChip}>
                <Text style={styles.detailsMacroLabel}>Karbo</Text>
                <Text style={styles.detailsMacroValue}>
                  {Math.round(Number(detailsMeal?.totalCarbs || 0))} g
                </Text>
              </View>
              <View style={styles.detailsMacroChip}>
                <Text style={styles.detailsMacroLabel}>Fett</Text>
                <Text style={styles.detailsMacroValue}>
                  {Math.round(Number(detailsMeal?.totalFats || 0))} g
                </Text>
              </View>
            </View>

            <Text style={styles.detailsIngredientsTitle}>Ingredienser</Text>

            <ScrollView
              style={styles.detailsIngredientsList}
              contentContainerStyle={styles.detailsIngredientsContent}
              showsVerticalScrollIndicator={false}
            >
              {detailIngredients.length === 0 ? (
                <Text style={styles.detailsIngredientText}>
                  Ingen ingredienser registrert.
                </Text>
              ) : (
                detailIngredients.map((ing) => (
                  <View key={ing.id} style={styles.detailsIngredientRow}>
                    <View style={styles.detailsIngredientTopRow}>
                      <Text
                        numberOfLines={1}
                        style={styles.detailsIngredientText}
                      >
                        {ing.name || "Ingrediens"}
                      </Text>
                      <Text style={styles.detailsIngredientAmount}>
                        {Math.round(Number(ing.amountGrams || 0))} g
                      </Text>
                    </View>

                    <View style={styles.detailsIngredientMacrosRow}>
                      <Text style={styles.detailsIngredientMacroTag}>
                        P {Math.round(Number(ing.proteins || 0))} g
                      </Text>
                      <Text style={styles.detailsIngredientMacroTag}>
                        K {Math.round(Number(ing.carbs || 0))} g
                      </Text>
                      <Text style={styles.detailsIngredientMacroTag}>
                        F {Math.round(Number(ing.fats || 0))} g
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.14)",
    marginBottom: 18,
    padding: 14,
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  statsChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(8,47,73,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsValue: {
    color: "#E6FFFB",
    fontSize: 12,
    fontWeight: "500",
  },
  statsLabel: {
    color: "rgba(207,250,254,0.9)",
    fontSize: 9,
    fontWeight: "400",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    maxWidth: 240,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.36)",
    backgroundColor: "rgba(8,47,73,0.86)",
  },
  createBtnText: {
    color: "#E6FFFB",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    backgroundColor: "rgba(2,6,23,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 4,
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  emptySub: {
    textAlign: "center",
    color: "rgba(148,163,184,0.9)",
    fontSize: 11,
  },
  mealList: {
    gap: 10,
    paddingRight: 4,
  },
  listSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.20)",
    backgroundColor: "rgba(7,18,34,0.22)",
    padding: 10,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listTitleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(8,47,73,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listTitleText: {
    color: "#E6FFFB",
    fontSize: 11,
    fontWeight: "500",
  },
  listHint: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 10,
    fontWeight: "400",
  },
  mealCard: {
    flexDirection: "row",
    width: 338,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.28)",
    backgroundColor: "rgba(15,23,42,0.26)",
    overflow: "hidden",
  },
  mealCardPressed: {
    opacity: 0.95,
  },
  imageStrip: {
    width: 88,
    position: "relative",
  },
  verticalStats: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  statLabel: {
    color: "rgba(226,232,240,0.7)",
    fontSize: 10,
    fontWeight: "400",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(226,232,240,0.2)",
  },
  cardContent: {
    flex: 1,
    padding: 13,
    justifyContent: "space-between",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  mealNameContainer: {
    flex: 1,
  },
  mealName: {
    color: "#F1F5F9",
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 2,
  },
  metaText: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 11,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  favoriteBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineMacros: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  macroChipProtein: {
    flex: 1,
    backgroundColor: "rgba(168,85,247,0.1)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  macroChipCarbs: {
    flex: 1,
    backgroundColor: "rgba(34,211,238,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  macroChipFats: {
    flex: 1,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  macroChipLabel: {
    color: "rgba(226,232,240,0.7)",
    fontSize: 9,
    fontWeight: "400",
    marginBottom: 2,
  },
  macroChipValueProtein: {
    color: "#D8B4FE",
    fontSize: 14,
    fontWeight: "600",
  },
  macroChipValueCarbs: {
    color: "#67E8F9",
    fontSize: 14,
    fontWeight: "600",
  },
  macroChipValueFats: {
    color: "#6EE7B7",
    fontSize: 14,
    fontWeight: "600",
  },
  progressSection: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "400",
  },
  lastUsedText: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(248,250,252,0.05)",
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
  },
  progressProtein: {
    backgroundColor: "#A855F7",
    height: "100%",
  },
  progressCarbs: {
    backgroundColor: "#22D3EE",
    height: "100%",
  },
  progressFats: {
    backgroundColor: "#10B981",
    height: "100%",
  },
  rowActionWrap: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(15,23,42,0.72)",
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  actionText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 12,
    fontWeight: "500",
  },
  primaryAction: {
    borderColor: "rgba(34,211,238,0.36)",
    backgroundColor: "rgba(8,47,73,0.9)",
  },
  primaryActionText: {
    color: "#E6FFFB",
    fontSize: 12,
    fontWeight: "500",
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.68)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.56)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  detailsPopup: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(15,23,42,0.98)",
    overflow: "hidden",
    padding: 14,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  detailsTitle: {
    flex: 1,
    color: "#E2E8F0",
    fontSize: 16,
    lineHeight: 21,
  },
  detailsCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsSubTitle: {
    marginTop: 6,
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "500",
  },
  detailsMacroGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailsMacroChip: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(15,23,42,0.9)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  detailsMacroLabel: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 10,
    fontWeight: "400",
    marginBottom: 3,
  },
  detailsMacroValue: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "500",
  },
  detailsIngredientsTitle: {
    marginTop: 12,
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "500",
  },
  detailsIngredientsList: {
    marginTop: 8,
    maxHeight: 190,
  },
  detailsIngredientsContent: {
    gap: 6,
    paddingBottom: 2,
  },
  detailsIngredientRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(2,6,23,0.38)",
    paddingVertical: 8,
    paddingHorizontal: 9,
    gap: 6,
  },
  detailsIngredientTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detailsIngredientText: {
    flex: 1,
    color: "rgba(226,232,240,0.94)",
    fontSize: 11,
    fontWeight: "400",
  },
  detailsIngredientAmount: {
    color: "rgba(125,211,252,0.96)",
    fontSize: 11,
    fontWeight: "500",
  },
  detailsIngredientMacrosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailsIngredientMacroTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(8,47,73,0.58)",
    color: "rgba(186,230,253,0.98)",
    fontSize: 10,
    fontWeight: "500",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  confirmPopup: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "86%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.38)",
    backgroundColor: "rgba(11,30,52,0.97)",
    overflow: "hidden",
    padding: 15,
  },
  confirmTopAccent: {
    height: 3,
    width: "54%",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 10,
  },
  confirmBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(14,116,144,0.7)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 8,
  },
  confirmBadgeText: {
    color: "#ECFEFF",
    fontSize: 10,
    fontWeight: "500",
  },
  confirmTitle: {
    color: "#F0F9FF",
    fontSize: 15,
    fontWeight: "500",
  },
  confirmMealName: {
    marginTop: 4,
    color: "rgba(191,219,254,0.94)",
    fontSize: 12,
    fontWeight: "400",
  },
  servingsControl: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.3)",
    backgroundColor: "rgba(14,116,144,0.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  servingsInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.4)",
    backgroundColor: "rgba(15,51,75,0.62)",
    color: "#F0F9FF",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  servingsPresetsRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 7,
  },
  servingsPresetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(15,51,75,0.48)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  servingsPresetChipActive: {
    borderColor: "rgba(34,211,238,0.5)",
    backgroundColor: "rgba(8,145,178,0.78)",
  },
  servingsPresetText: {
    color: "rgba(191,219,254,0.95)",
    fontSize: 11,
    fontWeight: "500",
  },
  servingsPresetTextActive: {
    color: "#ECFEFF",
  },
  confirmPreviewCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(12,44,70,0.56)",
    padding: 10,
    gap: 8,
  },
  confirmPreviewTitle: {
    color: "#ECFEFF",
    fontSize: 12,
    fontWeight: "500",
  },
  confirmMacroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  confirmMacroChip: {
    width: "48%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(8,47,73,0.66)",
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  confirmMacroLabel: {
    color: "rgba(191,219,254,0.95)",
    fontSize: 10,
    fontWeight: "400",
  },
  confirmMacroValue: {
    marginTop: 2,
    color: "#ECFEFF",
    fontSize: 13,
    fontWeight: "500",
  },
  confirmIngredientsTitle: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 11,
    fontWeight: "500",
  },
  confirmIngredientsList: {
    maxHeight: 170,
  },
  confirmIngredientsContent: {
    gap: 6,
    paddingBottom: 2,
  },
  confirmIngredientRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    backgroundColor: "rgba(8,47,73,0.54)",
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 5,
  },
  confirmIngredientTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  confirmIngredientName: {
    flex: 1,
    color: "rgba(236,254,255,0.95)",
    fontSize: 11,
    fontWeight: "400",
  },
  confirmIngredientAmount: {
    color: "rgba(165,243,252,0.98)",
    fontSize: 11,
    fontWeight: "500",
  },
  confirmIngredientMacrosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confirmIngredientMacroTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(14,116,144,0.58)",
    color: "rgba(224,242,254,0.98)",
    fontSize: 10,
    fontWeight: "500",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  confirmActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  confirmSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.3)",
    backgroundColor: "rgba(15,51,75,0.62)",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSecondaryText: {
    color: "rgba(224,242,254,0.94)",
    fontSize: 12,
    fontWeight: "500",
  },
  confirmPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.5)",
    backgroundColor: "rgba(8,145,178,0.86)",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmPrimaryText: {
    color: "#ECFEFF",
    fontSize: 12,
    fontWeight: "500",
  },
});
