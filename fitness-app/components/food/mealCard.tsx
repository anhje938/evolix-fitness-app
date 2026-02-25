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

const PURPLE = {
  main: "rgba(216, 54, 181, 0.70)", // classy magenta-purple
  soft: "rgba(216, 54, 181, 0.22)",
  softer: "rgba(216, 54, 181, 0.12)",
  deepBg: "rgba(20, 6, 26, 0.20)",
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

  // Premium tom-state (mer kontrast + lilla accent)
  if (todaysMeals.length === 0) {
    return (
      <View style={[generalStyles.newCard, styles.emptyCard]}>
        {/* Purple sheen for contrast */}
        <View pointerEvents="none" style={styles.sheenWrap}>
          <LinearGradient
            colors={[
              "rgba(216, 54, 181, 0.18)",
              "rgba(59, 130, 246, 0.08)",
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
            "rgba(6, 182, 212, 0.85)",
            "rgba(59, 130, 246, 0.85)",
            "rgba(216, 54, 181, 0.75)",
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

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {todaysMeals.map((meal) => {
        const iso = parseISO(meal.timestampUtc);

        return (
          <Pressable
            key={meal.id}
            onLongPress={() => openMenu(meal)}
            delayLongPress={250}
            android_ripple={{ color: "rgba(255,255,255,0.04)" }}
            style={({ pressed }) => [
              styles.cardPressable,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[generalStyles.newCard, styles.card]}>
              {/* Purple-tinted contrast layer (under sheen) */}
              <View pointerEvents="none" style={styles.tintLayer} />

              {/* Diagonal purple sheen */}
              <View pointerEvents="none" style={styles.sheenWrap}>
                <LinearGradient
                  colors={[
                    "rgba(216, 54, 181, 0.22)",
                    "rgba(59, 130, 246, 0.10)",
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
                  "rgba(6, 182, 212, 0.90)",
                  "rgba(59, 130, 246, 0.90)",
                  "rgba(216, 54, 181, 0.80)",
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
                        "rgba(216, 54, 181, 0.20)",
                        "rgba(59, 130, 246, 0.10)",
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

              {/* Optional: tiny hint that it’s interactive */}
              <View style={styles.longPressHint}>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color="rgba(148,163,184,0.55)"
                />
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroPill}>
      <View pointerEvents="none" style={styles.pillGlowWrap}>
        <LinearGradient
          colors={[
            "rgba(216, 54, 181, 0.14)",
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
  scroll: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 12,
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
    borderColor: PURPLE.softer,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PURPLE.deepBg,
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
    width: "46%",
    borderRadius: 999,
    opacity: 0.95,
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
    borderColor: PURPLE.soft,
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
    borderColor: "rgba(255,255,255,0.06)",
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

  longPressHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    opacity: 0.8,
  },

  emptyCard: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PURPLE.softer,
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
    backgroundColor: PURPLE.softer,
    borderWidth: 1,
    borderColor: PURPLE.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: {
    fontSize: 16,
    color: "rgba(216, 54, 181, 0.85)",
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
