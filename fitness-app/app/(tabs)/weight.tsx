import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import WeightHistory from "@/components/weight/WeightHistory";
import { AddWeightButton } from "@/components/weight/addWeightButton";
import { AddWeightSheet } from "@/components/weight/addWeightSheet";
import { getWeeklySummary } from "@/utils/groupListByWeek";

import { PostWeight } from "@/api/weight";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { WeightProgressChart } from "@/components/weight/weight-chart/WeightProgressChart";
import { generalStyles } from "@/config/styles";
import { useAuth } from "@/context/AuthProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWeightContext } from "@/context/WeightProvider";

export default function WeightPage() {
  const [isOpen, setIsOpen] = useState(false);

  const { token } = useAuth();
  const { userSettings } = useUserSettings();

  const { weightList, refetch } = useWeightContext();

  const weeklySummary = getWeeklySummary(weightList);

  const handlePostWeight = async (weightKg: number, timestampUtc: string) => {
    try {
      if (!token) return;
      const data = await PostWeight(token, weightKg, timestampUtc);

      console.log(JSON.stringify(data));

      refetch();

      setIsOpen(false);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <DarkOceanBackground style={generalStyles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WeightProgressChart
          dotRadius={2}
          lineStrokeWidth={1}
          weightList={weightList}
          height={300}
          maxXLabels={15}
          minZoom={0.1}
          minXLabels={5}
          goalValue={Number(userSettings.weightGoalKg ?? 0)}
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
  content: {
    alignItems: "center",
    paddingBottom: 40,
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
