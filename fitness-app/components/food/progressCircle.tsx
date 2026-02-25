import ConfettiIcon from "@/assets/icons/confetti.svg";
import React, { useId, useMemo } from "react";
import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

export type ProgressCircleProps = {
  percentage: number;
  size?: number;
  strokeWidth?: number;

  accentColor?: string;
  useGradient?: boolean;

  icon?: React.ReactNode; // ONLY calories
  children?: React.ReactNode;

  label?: string;
  subLabel?: string;

  currentValue?: number | string;
  maxValue?: number | string;
  showFraction?: boolean;

  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  subLabelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  fractionStyle?: StyleProp<TextStyle>;
};

const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

type RGBA = { r: number; g: number; b: number; a: number };

function parseColor(input?: string | null): RGBA | null {
  if (!input) return null;

  const rgba = input.match(
    /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)/
  );
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] == null ? 1 : Number(rgba[4]),
    };
  }

  if (input.startsWith("#")) {
    const h = input.slice(1);
    if (h.length === 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: 1,
      };
    }
  }

  return null;
}

const toRgba = (c: RGBA) => `rgba(${c.r},${c.g},${c.b},${clamp(c.a, 0, 1)})`;
const withAlpha = (c: RGBA, a: number): RGBA => ({ ...c, a });

/* ---------- ARC HELPERS ---------- */
const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const describeArc = (
  x: number,
  y: number,
  r: number,
  start: number,
  end: number
) => {
  const s = polarToCartesian(x, y, r, start);
  const e = polarToCartesian(x, y, r, end);
  const large = end - start <= 180 ? "0" : "1";
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

/* ---------- DEFAULTS ---------- */
const defaults = {
  accent: "rgba(56,189,248,1)", // fallback only
  text: "rgba(255,255,255,0.96)",
  sub: "rgba(255,255,255,0.70)",
  label: "rgba(255,255,255,0.88)",
};

export const ProgressCircle = ({
  percentage,
  size = 128,
  strokeWidth,

  accentColor = defaults.accent,
  useGradient = true,

  icon,
  children,

  label,
  subLabel,

  currentValue,
  maxValue,
  showFraction = true,

  containerStyle,
  labelStyle,
  subLabelStyle,
  valueStyle,
  fractionStyle,
}: ProgressCircleProps) => {
  const pctRaw = Number(percentage) || 0;
  const isComplete = pctRaw >= 100;

  // ✅ Visual percent capped to 0–100 so ring is full when >= 100
  const pct = clamp(pctRaw, 0, 100);

  const sw = strokeWidth ?? Math.max(4, Math.round(size * 0.045));
  const r = (size - sw) / 2;
  const c = size / 2;

  const uid = useId().replace(/[:]/g, "_");
  const ids = {
    prog: `pc_prog_${uid}`,
  };

  const accent = parseColor(accentColor) ??
    parseColor(defaults.accent) ?? { r: 56, g: 189, b: 248, a: 1 };

  // ✅ Same color logic: ALL derived from accentColor
  const colors = {
    track: toRgba(withAlpha(accent, 0.48)),
    prog0: toRgba(withAlpha(accent, 1)),
    prog1: toRgba(withAlpha(accent, 0.97)),
    chipBg: toRgba(withAlpha(accent, 0.14)),
    frac: toRgba(withAlpha(accent, 0.9)),
  };

  const fullCircle = useMemo(() => describeArc(c, c, r, 0, 359.999), [c, r]);

  // ✅ IMPORTANT: handle "full ring" (true 360° arcs are flaky)
  const endAngle = pct >= 100 ? 359.999 : (pct / 100) * 360;

  const progressPath =
    pct <= 0 ? null : describeArc(c, c, r, 0, Math.max(0.001, endAngle));

  const valueFont = Math.round(size * 0.2);
  const fracFont = Math.round(size * 0.085);
  const labelFont = Math.round(size * 0.12);

  // ✅ Inner area for confetti (no size/layout changes; just fills the center)
  const innerSize = Math.max(0, Math.round(size - sw * 2.2));
  const innerRadius = Math.round(innerSize / 2);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={ids.prog} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.prog0} />
              <Stop offset="100%" stopColor={colors.prog1} />
            </LinearGradient>
          </Defs>

          {/* TRACK */}
          <Path
            d={fullCircle}
            stroke={colors.track}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
          />

          {/* PROGRESS */}
          {progressPath && (
            <Path
              d={progressPath}
              stroke={useGradient ? `url(#${ids.prog})` : colors.prog0}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
            />
          )}
        </Svg>

        {/* ✅ CONFETTI BACKGROUND (only at 100%+) */}
        {isComplete && innerSize > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (size - innerSize) / 2,
              top: (size - innerSize) / 2,
              width: innerSize,
              height: innerSize,
              borderRadius: innerRadius,
              overflow: "hidden",
              opacity: 0.3, // premium subtle
            }}
          >
            <ConfettiIcon width={innerSize} height={innerSize} />
          </View>
        )}

        {/* CENTER */}
        <View style={styles.center}>
          {children ? (
            children
          ) : (
            <View style={{ alignItems: "center" }}>
              {icon && (
                <View
                  style={{
                    backgroundColor: colors.chipBg,
                    borderRadius: 999,
                    padding: 6,
                    marginBottom: 6,
                  }}
                >
                  {icon}
                </View>
              )}

              {currentValue != null && (
                <Text
                  style={[
                    {
                      fontSize: valueFont,
                      fontWeight: "600",
                      color: defaults.text,
                    },
                    valueStyle,
                  ]}
                >
                  {currentValue}
                </Text>
              )}

              {showFraction && maxValue != null && (
                <Text
                  style={[
                    {
                      fontSize: fracFont,
                      fontWeight: "500",
                      color: colors.frac,
                    },
                    fractionStyle,
                  ]}
                >
                  of {maxValue}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {label && (
        <Text
          style={[
            {
              marginTop: 10,
              fontSize: labelFont,
              fontWeight: "500",
              color: defaults.label,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      {subLabel && (
        <Text
          style={[
            { marginTop: 4, fontSize: 11, color: defaults.sub },
            subLabelStyle,
          ]}
        >
          {subLabel}
        </Text>
      )}
    </View>
  );
};

const styles = {
  wrap: { alignItems: "center" as const },
  center: {
    position: "absolute" as const,
    inset: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
