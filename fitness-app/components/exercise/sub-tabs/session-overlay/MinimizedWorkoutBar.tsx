import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
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
  PanGestureHandler,
  State as GestureState,
} from "react-native-gesture-handler";
import { clamp } from "./overlayGuards";

const overlayColors = {
  container: "rgba(15,23,42,0.98)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  borderAccent: "rgba(34,211,238,0.18)",
  text: "#E5ECFF",
  textStrong: "#F8FBFF",
  muted2: "rgba(148,163,184,0.72)",
  accent: "#06b6d4",
  accentBg: "rgba(6,182,212,0.08)",
  success: "#34d399",
  successGlow: "rgba(52,211,153,0.24)",
};

let lastMinimizedBarPos: { x: number; y: number } | null = null;

type MinimizedWorkoutBarProps = {
  title: string;
  subtitle: string;
  onExpand: () => void;
};

export const DraggableMinimizedBar = memo(function DraggableMinimizedBar({
  title,
  subtitle,
  onExpand,
}: MinimizedWorkoutBarProps) {
  const screen = Dimensions.get("window");

  const BAR_W = Math.min(screen.width - 24, 382);
  const BAR_H = 68;

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
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.96)).current;
  const entranceLift = useRef(new Animated.Value(18)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const baseXNum = useRef(startX);
  const baseYNum = useRef(startY);
  const dragXNum = useRef(0);
  const dragYNum = useRef(0);

  const panRef = useRef<PanGestureHandler>(null);

  const pressArmedRef = useRef(false);
  const dragStartedRef = useRef(false);
  const expandInFlightRef = useRef(false);

  useEffect(() => {
    const sx = dragX.addListener(({ value }) => {
      dragXNum.current = value;
    });
    const sy = dragY.addListener(({ value }) => {
      dragYNum.current = value;
    });

    return () => {
      dragX.removeListener(sx);
      dragY.removeListener(sy);
    };
  }, [dragX, dragY]);

  useEffect(() => {
    entranceOpacity.setValue(0);
    entranceScale.setValue(0.96);
    entranceLift.setValue(18);

    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 19,
        bounciness: 0,
      }),
      Animated.spring(entranceLift, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }),
    ]).start();
  }, [entranceLift, entranceOpacity, entranceScale]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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
    if (expandInFlightRef.current) return;

    expandInFlightRef.current = true;

    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(entranceScale, {
        toValue: 0.985,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(entranceLift, {
        toValue: 12,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      expandInFlightRef.current = false;
      if (finished) onExpand();
    });
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

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
            {
              opacity: entranceOpacity,
              transform: [
                { translateX: tx },
                { translateY: Animated.add(ty, entranceLift) },
                { scale: entranceScale },
              ],
            },
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
              pressed && styles.floatingPressPressed,
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(30,41,59,0.98)",
                "rgba(15,23,42,0.98)",
                "rgba(8,15,28,0.99)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={["rgba(34,211,238,0.12)", "rgba(34,211,238,0.00)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentRail}
            />
            <View style={styles.topSheen} pointerEvents="none" />

            <View style={styles.floatingInner}>
              <View style={styles.floatingIcon}>
                <LinearGradient
                  colors={["rgba(34,211,238,0.22)", "rgba(6,182,212,0.06)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={overlayColors.textStrong}
                />
                <View style={styles.liveDotWrap}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.liveDotHalo,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  />
                  <View style={styles.liveDot} />
                </View>
              </View>

              <View style={styles.textBlock}>
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
                <LinearGradient
                  colors={["rgba(34,211,238,0.16)", "rgba(34,211,238,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
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
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: overlayColors.container,
    borderWidth: 1,
    borderColor: overlayColors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 14,
  },

  floatingPressPressed: {
    opacity: 0.98,
  },

  accentRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 98,
  },

  topSheen: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  floatingInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },

  floatingIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.borderAccent,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },

  liveDotWrap: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  liveDotHalo: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: overlayColors.successGlow,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: overlayColors.success,
  },

  textBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  floatingTitle: {
    color: overlayColors.textStrong,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  floatingSubtitle: {
    color: overlayColors.muted2,
    fontSize: 11,
    letterSpacing: 0.1,
    marginTop: 0,
  },

  floatingChip: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.borderAccent,
    overflow: "hidden",
  },
});
