import { newColors } from "@/config/theme";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

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
  backgroundColor = "transparent",
}: Props) {
  const [width, setWidth] = useState(0);

  const cappedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (data.length < 10) return data;
    return data.slice(-15);
  }, [data]);

  const values = useMemo(() => {
    if (!cappedData || cappedData.length === 0) return [];

    return cappedData.map((p) =>
      typeof p.topSetWeight === "number" && !isNaN(p.topSetWeight)
        ? p.topSetWeight
        : 0
    );
  }, [cappedData]);

  const points = useMemo(() => {
    if (width <= 0 || values.length === 0) return [];

    const horizontalPadding = 8;
    const verticalPadding = 12;
    const chartWidth = Math.max(width - horizontalPadding * 2, 1);
    const chartHeight = Math.max(height - verticalPadding * 2, 1);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;

    return values.map((value, index) => ({
      x: horizontalPadding + stepX * index,
      y: verticalPadding + chartHeight - ((value - min) / range) * chartHeight,
      value,
    }));
  }, [height, values, width]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(
            2
          )}`
      )
      .join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";

    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x.toFixed(2)} ${(height - 4).toFixed(
      2
    )} L ${first.x.toFixed(2)} ${(height - 4).toFixed(2)} Z`;
  }, [height, linePath, points]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  return (
    <View
      style={{
        width: "100%",
        height,
        backgroundColor,
      }}
      onLayout={handleLayout}
    >
      {width > 0 && points.length > 0 && (
        <Svg width={width} height={height} style={styles.svg}>
          <Defs>
            <LinearGradient
              id="historyStroke"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <Stop offset="0%" stopColor="#60a5fa" />
              <Stop offset="45%" stopColor={lineColor} />
              <Stop offset="100%" stopColor="#67e8f9" />
            </LinearGradient>
            <LinearGradient id="historyFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop
                stopOpacity={"35SS%"}
                offset="0%"
                stopColor="rgba(1, 225, 255, 0.99)"
              />
              <Stop
                stopOpacity={"2%"}
                offset="100%"
                stopColor="rgba(34, 116, 238, 0)"
              />
            </LinearGradient>
          </Defs>

          {areaPath ? <Path d={areaPath} fill="url(#historyFill)" /> : null}

          <Path
            d={linePath}
            stroke="rgba(103,232,249,0.035)"
            strokeWidth={2.3}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <Path
            d={linePath}
            stroke="url(#historyStroke)"
            strokeWidth={1.7}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((point, index) => {
            const isLast = index === points.length - 1;

            return (
              <React.Fragment key={`${point.x}-${point.y}-${index}`}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 5.5 : 3.7}
                  fill={
                    isLast ? "rgba(147,197,253,0.20)" : "rgba(224,242,254,0.10)"
                  }
                />
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 2.7 : 1.85}
                  fill={isLast ? "#93c5fd" : "#e0f2fe"}
                  opacity={isLast ? 1 : 0.88}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    overflow: "visible",
  },
});
