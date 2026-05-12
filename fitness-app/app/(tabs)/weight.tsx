import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeleteWeight, PostWeight, UpdateWeight } from "@/api/weight";
import { BodyGoalCoachCard } from "@/components/coaching/BodyGoalCoachCard";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import WeightHistory from "@/components/weight/WeightHistory";
import { AddWeightButton } from "@/components/weight/addWeightButton";
import { AddWeightSheet } from "@/components/weight/addWeightSheet";
import { WeightProgressChart } from "@/components/weight/weight-chart/WeightProgressChart";
import { floatingActionButtonDock } from "@/config/floatingActionButton";
import { useAuth } from "@/context/AuthProvider";
import { useFoodContext } from "@/context/FoodProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWeightContext } from "@/context/WeightProvider";
import { buildBodyGoalCoach } from "@/utils/coaching/bodyGoalCoach";
import { getWeeklySummary } from "@/utils/groupListByWeek";
import type { Weight } from "@/types/weight";

export default function WeightPage() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<Weight | null>(null);

  const { token } = useAuth();
  const { userSettings } = useUserSettings();
  const { foodList } = useFoodContext();
  const { weightList, refetch } = useWeightContext();

  const weeklySummary = getWeeklySummary(weightList);
  const rawGoalWeight = Number(userSettings.weightGoalKg ?? 0);
  const goalWeight =
    Number.isFinite(rawGoalWeight) && rawGoalWeight > 0
      ? rawGoalWeight
      : undefined;
  const weightCoach = useMemo(
    () =>
      buildBodyGoalCoach({
        weightList,
        foodList,
        userSettings,
      }),
    [foodList, userSettings, weightList]
  );

  const handlePostWeight = async (weightKg: number, timestampUtc: string) => {
    try {
      if (!token) return;
      if (editingWeight) {
        await UpdateWeight(token, editingWeight.id, weightKg, timestampUtc);
      } else {
        await PostWeight(token, weightKg, timestampUtc);
      }
      refetch();
      setEditingWeight(null);
      setIsOpen(false);
    } catch (error) {
      if (__DEV__) console.log(error);
      Alert.alert("Kunne ikke lagre vekt", "Prøv igjen om et øyeblikk.");
    }
  };

  const openEditWeight = (weight: Weight) => {
    setEditingWeight(weight);
    setIsOpen(true);
  };

  const handleDeleteWeight = (
    weight: Weight,
    options?: { closeSheet?: boolean }
  ) => {
    Alert.alert(
      "Slette vekt?",
      `${weight.weightKg.toFixed(1)} kg fjernes fra historikken.`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            try {
              if (!token) return;
              await DeleteWeight(token, weight.id);
              await refetch();
              if (options?.closeSheet) {
                setIsOpen(false);
                setEditingWeight(null);
              }
            } catch (error) {
              if (__DEV__) console.log(error);
              Alert.alert("Kunne ikke slette vekt", "Prøv igjen om et øyeblikk.");
            }
          },
        },
      ]
    );
  };

  return (
    <DarkOceanBackground style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WeightProgressChart
          dotRadius={2}
          lineStrokeWidth={1.7}
          weightList={weightList}
          height={292}
          maxXLabels={15}
          minZoom={0.1}
          maxZoom={5}
          zoomStep={0.35}
          minXLabels={5}
          goalValue={goalWeight}
        />

        <PremiumGate
          featureTitle="Vektcoach"
          description="Få roligere og mer presise justeringer basert på trendvekt, mål og logging."
          style={styles.coachSection}
        >
          <BodyGoalCoachCard recommendation={weightCoach} variant="weight" />
        </PremiumGate>

        <WeightHistory
          weightList={weightList}
          weeklySummary={weeklySummary}
          onEditWeight={openEditWeight}
        />
      </ScrollView>

      <View pointerEvents="box-none" style={styles.footerContainer}>
        {!isOpen && (
          <AddWeightButton
            onPress={() => {
              setEditingWeight(null);
              setIsOpen(true);
            }}
          />
        )}
      </View>

      {isOpen && (
        <AddWeightSheet
          postWeight={handlePostWeight}
          isOpen={isOpen}
          initialEntry={editingWeight}
          onDelete={() => {
            if (editingWeight) {
              handleDeleteWeight(editingWeight, { closeSheet: true });
            }
          }}
          onClose={() => {
            setIsOpen(false);
            setEditingWeight(null);
          }}
        />
      )}
    </DarkOceanBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    paddingHorizontal: 20,
  },
  content: {
    alignItems: "stretch",
    paddingBottom: 148,
  },
  coachSection: {
    marginBottom: 16,
  },
  footerContainer: {
    ...floatingActionButtonDock,
  },
});
