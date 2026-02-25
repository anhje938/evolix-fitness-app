import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  State as GestureState,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { clamp } from "./overlayGuards";

const overlayColors = {
  container: "rgba(15,23,42,0.98)",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#E5ECFF",
  muted2: "rgba(148,163,184,0.7)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.2)",
  accentBg: "rgba(6,182,212,0.08)",
};

/**
 * ✅ Persist minimized bar position across unmount/mount.
 */
let lastMinimizedBarPos: { x: number; y: number } | null = null;

type MinimizedWorkoutBarProps = {
  title: string;
  subtitle: string;
  onExpand: () => void;
};

/**
 * ✅ RNGH: activeOffsetX/Y creates a "deadzone" so taps feel like taps,
 * drags only activate after moving ~8px.
 *
 * ✅ Keep minimized bar at same position across minimize cycles.
 * ✅ Premium Dark Ocean design with shadow.
 */
export const DraggableMinimizedBar = memo(function DraggableMinimizedBar({
  title,
  subtitle,
  onExpand,
}: MinimizedWorkoutBarProps) {
  const screen = Dimensions.get("window");

  const BAR_W = 352;
  const BAR_H = 62;

  const DEFAULT_BOTTOM = 86;
  const EXTRA_UP = 100;

  const defaultStartX = Math.round((screen.width - BAR_W) / 2);
  const defaultStartY = Math.round(screen.height - DEFAULT_BOTTOM - EXTRA_UP);

  const startX = lastMinimizedBarPos?.x ?? defaultStartX;
  const startY = lastMinimizedBarPos?.y ?? defaultStartY;

  const baseX = useRef(new Animated.Value(startX)).current;
  const baseY = useRef(new Animated.Value(startY)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const baseXNum = useRef(startX);
  const baseYNum = useRef(startY);
  const dragXNum = useRef(0);
  const dragYNum = useRef(0);

  const panRef = useRef<PanGestureHandler>(null);

  const pressArmedRef = useRef(false);
  const dragStartedRef = useRef(false);

  useEffect(() => {
    const sx = dragX.addListener(({ value }) => (dragXNum.current = value));
    const sy = dragY.addListener(({ value }) => (dragYNum.current = value));
    return () => {
      dragX.removeListener(sx);
      dragY.removeListener(sy);
    };
  }, [dragX, dragY]);

  const onGestureEvent = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { translationX: dragX, translationY: dragY } }],
        { useNativeDriver: true }
      ),
    [dragX, dragY]
  );

  const M = 10;
  const TOP_SAFE = 60;
  const minX = M;
  const maxX = screen.width - BAR_W - M;
  const minY = TOP_SAFE;
  const maxY = screen.height - BAR_H - M;

  const persistPos = (x: number, y: number) => {
    lastMinimizedBarPos = { x, y };
  };

  const onHandlerStateChange = (evt: any) => {
    const state: GestureState = evt.nativeEvent.state;

    if (state === GestureState.ACTIVE) {
      dragStartedRef.current = true;
      pressArmedRef.current = false;
      return;
    }

    if (state !== GestureState.END && state !== GestureState.CANCELLED) return;

    if (!dragStartedRef.current) {
      dragX.setValue(0);
      dragY.setValue(0);
      return;
    }

    const nextX = clamp(baseXNum.current + dragXNum.current, minX, maxX);
    const nextY = clamp(baseYNum.current + dragYNum.current, minY, maxY);

    baseXNum.current = nextX;
    baseYNum.current = nextY;

    baseX.setValue(nextX);
    baseY.setValue(nextY);

    persistPos(nextX, nextY);

    dragX.setValue(0);
    dragY.setValue(0);

    pressArmedRef.current = false;
    dragStartedRef.current = false;
  };

  const tx = Animated.add(baseX, dragX);
  const ty = Animated.add(baseY, dragY);

  const handlePress = () => {
    if (!pressArmedRef.current) return;
    if (dragStartedRef.current) return;
    onExpand();
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <PanGestureHandler
        ref={panRef}
        activeOffsetX={[-8, 8]}
        activeOffsetY={[-8, 8]}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.floatingWrap,
            { width: BAR_W, height: BAR_H },
            { transform: [{ translateX: tx }, { translateY: ty }] },
          ]}
        >
          <Pressable
            onPress={handlePress}
            onPressIn={() => {
              pressArmedRef.current = true;
              dragStartedRef.current = false;
            }}
            onPressOut={() => {
              pressArmedRef.current = false;
            }}
            style={({ pressed }) => [
              styles.floatingPress,
              pressed && { opacity: 0.96 },
            ]}
          >
            <View style={styles.floatingInner}>
              <View style={styles.floatingIcon}>
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={overlayColors.text}
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[typography.bodyBold, styles.floatingTitle]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <Text
                  style={[typography.body, styles.floatingSubtitle]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              </View>

              <View style={styles.floatingChip}>
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={overlayColors.accent}
                />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

const styles = StyleSheet.create({
  floatingWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 9999,
  },

  floatingPress: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: overlayColors.container,
    borderWidth: 1,
    borderColor: overlayColors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  floatingInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },

  floatingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  floatingTitle: {
    color: overlayColors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  floatingSubtitle: {
    color: overlayColors.muted2,
    fontSize: 12,
    marginTop: 1,
    letterSpacing: 0.1,
  },

  floatingChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },
});
