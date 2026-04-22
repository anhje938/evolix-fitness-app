import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions } from "react-native";
import { State } from "react-native-gesture-handler";

const screenWidth = Dimensions.get("window").width;

type Params = {
  pointCount: number;
  height: number;
  baseContentWidth: number;
  staticWidthOffset?: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  minVisibleLabels: number;
  maxVisibleLabels: number;
  fallbackWidthPadding?: number;
};

export function useSvgChartZoom({
  pointCount,
  height,
  baseContentWidth,
  staticWidthOffset = 0,
  minZoom,
  maxZoom,
  zoomStep,
  minVisibleLabels,
  maxVisibleLabels,
  fallbackWidthPadding = 48,
}: Params) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isPinching, setIsPinching] = useState(false);
  const baseZoomRef = useRef<number>(1);
  const pinchScale = useRef(new Animated.Value(1)).current;

  const zoomState = useMemo(() => {
    const fallbackWidth = Math.max(160, screenWidth - fallbackWidthPadding);
    const effectiveContainerWidth = containerWidth ?? fallbackWidth;
    const safeStaticWidthOffset = Math.max(0, staticWidthOffset);
    const safeBaseContentWidth = Math.max(1, baseContentWidth);
    const availableContentWidth = Math.max(
      1,
      effectiveContainerWidth - safeStaticWidthOffset
    );
    const computedMinZoom =
      pointCount > 1
        ? Math.min(1, availableContentWidth / safeBaseContentWidth)
        : 1;
    const effectiveMinZoom = Math.max(minZoom, computedMinZoom);
    const effectiveMaxZoom =
      pointCount > 1 ? Math.max(effectiveMinZoom, maxZoom) : effectiveMinZoom;
    const chartWidth = Math.max(
      effectiveContainerWidth,
      safeStaticWidthOffset + safeBaseContentWidth * zoom
    );
    const contentWidth = Math.max(1, safeBaseContentWidth * zoom);
    const pointSpacing =
      pointCount > 1 ? contentWidth / pointCount : contentWidth;
    const canZoomIn = pointCount > 1 && zoom < effectiveMaxZoom - 0.01;
    const canZoomOut = pointCount > 1 && zoom > effectiveMinZoom + 0.01;
    const renderMode =
      pointSpacing < 10 ? "overview" : pointSpacing < 22 ? "compact" : "full";

    return {
      effectiveContainerWidth,
      effectiveMinZoom,
      effectiveMaxZoom,
      chartWidth,
      chartHeight: height,
      contentWidth,
      pointSpacing,
      renderMode,
      canZoomIn,
      canZoomOut,
      shouldEnableHorizontalScroll: chartWidth > effectiveContainerWidth + 1,
    };
  }, [
    baseContentWidth,
    containerWidth,
    fallbackWidthPadding,
    height,
    maxZoom,
    minZoom,
    pointCount,
    staticWidthOffset,
    zoom,
  ]);

  const clampZoom = useCallback(
    (value: number) =>
      Math.min(
        zoomState.effectiveMaxZoom,
        Math.max(zoomState.effectiveMinZoom, value)
      ),
    [zoomState.effectiveMaxZoom, zoomState.effectiveMinZoom]
  );

  const applyZoom = useCallback(
    (value: number) => {
      const nextZoom = clampZoom(value);
      pinchScale.setValue(1);
      baseZoomRef.current = nextZoom;
      setZoom(nextZoom);
      return nextZoom;
    },
    [clampZoom, pinchScale]
  );

  useEffect(() => {
    setZoom((currentZoom) => {
      const nextZoom = clampZoom(currentZoom);
      if (Math.abs(nextZoom - currentZoom) < 0.001) {
        return currentZoom;
      }
      baseZoomRef.current = nextZoom;
      return nextZoom;
    });
  }, [clampZoom]);

  useEffect(() => {
    baseZoomRef.current = zoom;
  }, [zoom]);

  const handleZoomIn = () => {
    applyZoom(zoom * (1 + zoomStep));
  };

  const handleZoomOut = () => {
    applyZoom(zoom / (1 + zoomStep));
  };

  const resetZoom = (value = 1) => {
    applyZoom(value);
  };

  const handlePinchEvent = useMemo(
    () =>
      Animated.event([{ nativeEvent: { scale: pinchScale } }], {
        useNativeDriver: true,
      }),
    [pinchScale]
  );

  const handlePinchStateChange = (event: any) => {
    const state = event?.nativeEvent?.state as number | undefined;
    if (state === State.BEGAN) {
      pinchScale.setValue(1);
      setIsPinching(true);
      baseZoomRef.current = zoom;
    }
    if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      const scale =
        (event?.nativeEvent?.scale as number | undefined) ?? 1;
      const nextZoom = clampZoom(baseZoomRef.current * scale);
      pinchScale.setValue(1);
      baseZoomRef.current = nextZoom;
      setZoom(nextZoom);
      setIsPinching(false);
    }
  };

  const dynamicMaxVisibleLabels = useMemo(() => {
    if (!pointCount) {
      return 0;
    }

    const minAllowedLabels = Math.min(Math.max(minVisibleLabels, 1), pointCount);
    const maxAllowedLabels = Math.min(
      Math.max(maxVisibleLabels, minAllowedLabels),
      pointCount
    );
    const zoomRange = zoomState.effectiveMaxZoom - zoomState.effectiveMinZoom;
    const zoomT =
      zoomRange > 0 ? (zoom - zoomState.effectiveMinZoom) / zoomRange : 0.5;

    return Math.round(
      minAllowedLabels + zoomT * (maxAllowedLabels - minAllowedLabels)
    );
  }, [
    maxVisibleLabels,
    minVisibleLabels,
    pointCount,
    zoom,
    zoomState.effectiveMaxZoom,
    zoomState.effectiveMinZoom,
  ]);

  return {
    containerWidth,
    setContainerWidth,
    zoom,
    isPinching,
    pinchScale,
    dynamicMaxVisibleLabels,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
    handlePinchEvent,
    handlePinchStateChange,
    ...zoomState,
  };
}
