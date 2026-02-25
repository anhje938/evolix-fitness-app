// components/exercise/exercise/MiniExerciseChart.tsx
import React, { useMemo, useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { newColors } from "@/config/theme";

type MiniExercisePoint = {
  performedAt: string;
  topSetWeight: number;
};

type Props = {
  data: MiniExercisePoint[];
  height?: number;
  lineColor?: string;
  backgroundColor?: string;
};

export function MiniExerciseChart({
  data,
  height = 90,
  lineColor = newColors.primary.light,
  backgroundColor = newColors.surface.glass,
}: Props) {
  const [width, setWidth] = useState(0);

  const cappedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (data.length <= 40) return data;
    return data.slice(-40);
  }, [data]);

  const values = useMemo(() => {
    if (!cappedData || cappedData.length === 0) return [0, 0];

    const raw = cappedData.map((p) =>
      typeof p.topSetWeight === "number" && !isNaN(p.topSetWeight)
        ? p.topSetWeight
        : 0
    );

    const min = Math.min(...raw);
    const max = Math.max(...raw);

    if (min === max) {
      return raw.map((v) => v + 0.01);
    }

    return raw;
  }, [cappedData]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  return (
    <View
      style={{
        width: "100%",
        height,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor,
      }}
      onLayout={handleLayout}
    >
      {width > 0 && (
        <LineChart
          data={{
            labels: values.map(() => ""),
            datasets: [
              {
                data: values,
                strokeWidth: 2,
                color: () => lineColor,
              },
            ],
          }}
          width={width}
          height={height}
          withDots={false}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLabels={false}
          withHorizontalLabels={false}
          withVerticalLines={false}
          fromZero={false}
          bezier
          segments={1}
          chartConfig={{
            backgroundGradientFrom: "transparent",
            backgroundGradientTo: "transparent",
            decimalPlaces: 0,
            color: () => lineColor,
            labelColor: () => "transparent",
            propsForBackgroundLines: {
              stroke: "transparent",
            },
          }}
          style={{
            paddingLeft: 0,
            paddingRight: 0,
            marginLeft: 0,
            marginRight: 0,
          }}
        />
      )}
    </View>
  );
}
