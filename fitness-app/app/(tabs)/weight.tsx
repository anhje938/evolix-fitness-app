import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostWeight } from "@/api/weight";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import WeightHistory from "@/components/weight/WeightHistory";
import { AddWeightButton } from "@/components/weight/addWeightButton";
import { AddWeightSheet } from "@/components/weight/addWeightSheet";
import { WeightProgressChart } from "@/components/weight/weight-chart/WeightProgressChart";
import { useAuth } from "@/context/AuthProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWeightContext } from "@/context/WeightProvider";
import { getWeeklySummary } from "@/utils/groupListByWeek";

export default function WeightPage() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const { token } = useAuth();
  const { userSettings } = useUserSettings();
  const { weightList, refetch } = useWeightContext();

  const weeklySummary = getWeeklySummary(weightList);
  const rawGoalWeight = Number(userSettings.weightGoalKg ?? 0);
  const goalWeight =
    Number.isFinite(rawGoalWeight) && rawGoalWeight > 0
      ? rawGoalWeight
      : undefined;

  const handlePostWeight = async (weightKg: number, timestampUtc: string) => {
    try {
      if (!token) return;
      await PostWeight(token, weightKg, timestampUtc);
      refetch();
      setIsOpen(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Kunne ikke lagre vekt", "Prøv igjen om et øyeblikk.");
    }
  };

  return (
    <DarkOceanBackground style={[styles.screen, { paddingTop: insets.top + 6 }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WeightProgressChart
          dotRadius={2}
          lineStrokeWidth={1.8}
          weightList={weightList}
          height={300}
          maxXLabels={15}
          minZoom={0.1}
          minXLabels={5}
          goalValue={goalWeight}
        />

        <WeightHistory weightList={weightList} weeklySummary={weeklySummary} />
      </ScrollView>

      <View style={styles.footerContainer}>
        {!isOpen && <AddWeightButton onPress={() => setIsOpen(true)} />}
      </View>

      <AddWeightSheet
        postWeight={handlePostWeight}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
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
    alignItems: "stretch",
    paddingBottom: 120,
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
