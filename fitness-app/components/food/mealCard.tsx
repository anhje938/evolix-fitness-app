import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Food } from "@/types/meal";
import { parseISO } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ClockIcon from "../../assets/icons/clock.svg";
import FireIcon from "../../assets/icons/fire.svg";

type MealCardProps = {
  foodList: Food[];
  onEditMeal?: (meal: Food) => void;
  onDeleteMeal?: (mealId: string) => void | Promise<void>;
};

const ACCENT = {
  main: "rgba(45, 212, 191, 0.62)",
  soft: "rgba(45, 212, 191, 0.22)",
  softer: "rgba(45, 212, 191, 0.12)",
  deepBg: "rgba(2, 6, 23, 0.22)",
};

export const MealCard = memo(function MealCard({
  foodList = [],
  onEditMeal,
  onDeleteMeal,
}: MealCardProps) {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todaysMeals = useMemo(() => {
    return foodList.filter((meal) => {
      if (!meal.timestampUtc) return false;
      return meal.timestampUtc.slice(0, 10) === todayKey;
    });
  }, [foodList, todayKey]);

  const openMenu = (meal: Food) => {
    const buttons: Array<{
      text: string;
      style?: "default" | "cancel" | "destructive";
      onPress?: () => void;
    }> = [];

    if (typeof onEditMeal === "function") {
      buttons.push({
        text: "Rediger",
        onPress: () => onEditMeal(meal),
      });
    }

    if (typeof onDeleteMeal === "function") {
      buttons.push({
        text: "Slett",
        style: "destructive",
        onPress: () => {
          // keep Alert handler sync; run async safely
          Promise.resolve(onDeleteMeal(String(meal.id))).catch((e) => {
            console.log("onDeleteMeal failed:", e);
          });
        },
      });
    }

    buttons.push({ text: "Avbryt", style: "cancel" });

    Alert.alert(
      meal.title?.trim() ? meal.title : "Måltid",
      "Hva vil du gjøre?",
      buttons,
      { cancelable: true }
    );
  };

  // Premium tom-state (samme ocean/cyan tema som resten av appen)
  if (todaysMeals.length === 0) {
    return (
      <View style={[generalStyles.newCard, styles.emptyCard]}>
        {/* Sheen for depth */}
        <View pointerEvents="none" style={styles.sheenWrap}>
          <LinearGradient
            colors={[
              "rgba(45, 212, 191, 0.14)",
              "rgba(20, 184, 166, 0.08)",
              "rgba(2, 6, 23, 0.00)",
            ]}
            start={{ x: 0.12, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.sheen}
          />
        </View>

        {/* Accent bar */}
        <LinearGradient
          colors={[
            "rgba(20, 184, 166, 0.80)",
            "rgba(45, 212, 191, 0.72)",
            "rgba(2, 6, 23, 0.00)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentBar}
        />

        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyIconText}>🍽</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyBlack, styles.emptyTitle]}>
            Ingen måltider registrert i dag
          </Text>
          <Text style={[typography.body, styles.emptySub]}>
            Logg et måltid for å se kalorier og makroer her.
          </Text>
        </View>
      </View>
    );
  }

  const showSwipeHint = todaysMeals.length > 1;

  return (
    <View style={styles.carouselWrap}>
      {showSwipeHint && (
        <View style={styles.swipeHintRow}>
          <Ionicons
            name="swap-horizontal"
            size={12}
            color="rgba(153,246,228,0.92)"
          />
          <Text style={[typography.body, styles.swipeHintText]}>
            Sveip for flere
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          showSwipeHint && styles.scrollContentWithHint,
        ]}
        style={styles.scroll}
      >
        {todaysMeals.map((meal) => {
          const iso = parseISO(meal.timestampUtc);

          return (
            <Pressable
              key={meal.id}
              onPress={() => openMenu(meal)}
              android_ripple={{ color: "rgba(255,255,255,0.04)" }}
              style={({ pressed }) => [
                styles.cardPressable,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[generalStyles.newCard, styles.card]}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    openMenu(meal);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.menuButton,
                    pressed && styles.menuButtonPressed,
                  ]}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={14}
                    color="rgba(226,232,240,0.95)"
                  />
                </Pressable>

                {/* Contrast layer under sheen */}
                <View pointerEvents="none" style={styles.tintLayer} />

                {/* Diagonal sheen */}
                <View pointerEvents="none" style={styles.sheenWrap}>
                <LinearGradient
                  colors={[
                    "rgba(45, 212, 191, 0.16)",
                    "rgba(20, 184, 166, 0.08)",
                    "rgba(2, 6, 23, 0.00)",
                  ]}
                    start={{ x: 0.12, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.sheen}
                  />
                </View>

                {/* Accent bar for interactivity */}
                <LinearGradient
                  colors={[
                    "rgba(20, 184, 166, 0.82)",
                    "rgba(45, 212, 191, 0.74)",
                    "rgba(2, 6, 23, 0.00)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.accentBar}
                />

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[typography.bodyBlack, styles.title]}
                  >
                    {meal.title || "Måltid"}
                  </Text>

                  <View style={styles.metaRow}>
                    <ClockIcon height={12} width={12} />
                    <Text style={[typography.body, styles.metaText]}>
                      {iso.time}
                    </Text>
                  </View>
                </View>

                {/* Calories */}
                <View style={styles.kcalChip}>
                  <View pointerEvents="none" style={styles.kcalGlowWrap}>
                    <LinearGradient
                      colors={[
                        "rgba(45, 212, 191, 0.14)",
                        "rgba(20, 184, 166, 0.10)",
                        "rgba(2, 6, 23, 0.00)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.kcalGlow}
                    />
                  </View>

                  <FireIcon height={16} width={16} />
                  <Text style={[typography.bodyBlack, styles.kcalText]}>
                    {Math.round(meal.calories)} kcal
                  </Text>
                </View>
              </View>

                {/* Macros */}
                <View style={styles.macrosRow}>
                  <MacroPill
                    label="Protein"
                    value={`${Math.round(meal.proteins)}g`}
                  />
                  <MacroPill label="Karbo" value={`${Math.round(meal.carbs)}g`} />
                  <MacroPill label="Fett" value={`${Math.round(meal.fats)}g`} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroPill}>
      <View pointerEvents="none" style={styles.pillGlowWrap}>
        <LinearGradient
          colors={[
            "rgba(45, 212, 191, 0.12)",
            "rgba(255,255,255,0.02)",
            "rgba(2, 6, 23, 0.00)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pillGlow}
        />
      </View>

      <Text style={[typography.body, styles.macroLabel]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[typography.bodyBlack, styles.macroValue]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselWrap: {
    width: "100%",
  },
  swipeHintRow: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
    marginRight: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.28)",
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.22)",
  },
  swipeHintText: {
    fontSize: 10,
    color: "rgba(204,251,241,0.95)",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  scroll: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  scrollContentWithHint: {
    paddingRight: 14,
  },

  // Pressable wrapper so ripple/pressed doesn't mess with card layout
  cardPressable: {
    borderRadius: 18,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.98,
  },

  card: {
    width: 320,
    padding: 16,
    borderRadius: 18,
    overflow: "hidden",

    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.16)",

    shadowColor: "#0d9488",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ACCENT.deepBg,
    opacity: 1,
  },

  sheenWrap: {
    position: "absolute",
    top: -55,
    left: -70,
    right: -70,
    bottom: -55,
  },
  sheen: {
    flex: 1,
    transform: [{ rotate: "-10deg" }],
  },

  accentBar: {
    height: 3,
    width: "58%",
    borderRadius: 999,
    opacity: 0.98,
    marginBottom: 12,
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  title: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    opacity: 0.82,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#CBD5E1",
  },

  kcalChip: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,

    backgroundColor: "rgba(2, 6, 23, 0.30)",
    borderWidth: 1,
    borderColor: ACCENT.soft,
  },
  kcalGlowWrap: {
    position: "absolute",
    top: -10,
    left: -14,
    right: -14,
    bottom: -10,
  },
  kcalGlow: {
    flex: 1,
  },
  kcalText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  macrosRow: {
    flexDirection: "row",
    gap: 10,
  },

  macroPill: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(2, 6, 23, 0.26)",
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.14)",
  },

  pillGlowWrap: {
    position: "absolute",
    top: -10,
    left: -14,
    right: -14,
    bottom: -10,
  },
  pillGlow: {
    flex: 1,
  },

  macroLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#E2E8F0",
    letterSpacing: 0.2,
  },

  menuButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    backgroundColor: "rgba(2, 6, 23, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.26)",
  },
  menuButtonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: "rgba(15,23,42,0.9)",
  },

  emptyCard: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ACCENT.softer,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    overflow: "hidden",
  },

  emptyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: ACCENT.softer,
    borderWidth: 1,
    borderColor: ACCENT.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: {
    fontSize: 16,
    color: "rgba(45, 212, 191, 0.85)",
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
  },
  emptySub: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
});
