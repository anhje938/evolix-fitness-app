import AnatomyFigure from "@/components/exercise/AnatomyFigure";
import { typography } from "@/config/typography";
import type { RecoveryMap } from "@/types/recovery";
import { toBodyHighlighterData } from "@/utils/recovery/toBodyHighlighterData";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  recoveryMap: RecoveryMap;
  gender?: "male" | "female";
};

export default function RecoveryAnatomyCard({
  recoveryMap,
  gender = "male",
}: Props) {
  const allBodyData = useMemo(() => {
    // ✅ only 1 argument (fixes TS2554)
    return toBodyHighlighterData(recoveryMap) as any[];
  }, [recoveryMap]);

  const frontData = useMemo(() => {
    // hvis dataelementene har "side", filtrer – ellers returner alt
    const hasSide = allBodyData?.some((x) => x?.side);
    if (!hasSide) return allBodyData;
    return allBodyData.filter((x) => !x.side || x.side === "front");
  }, [allBodyData]);

  const backData = useMemo(() => {
    const hasSide = allBodyData?.some((x) => x?.side);
    if (!hasSide) return allBodyData;
    return allBodyData.filter((x) => !x.side || x.side === "back");
  }, [allBodyData]);

  return (
    <LinearGradient
      colors={[
        "rgba(255,255,255,0.06)",
        "rgba(255,255,255,0.03)",
        "rgba(255,255,255,0.02)",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.innerStroke} />

      <LinearGradient
        colors={[
          "rgba(6,182,212,0.10)",
          "rgba(99,102,241,0.08)",
          "rgba(168,85,247,0.06)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glow}
      />

      <View style={styles.header}>
        <Text style={[typography.body, styles.title]}>Restitusjonskart</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>Forside</Text>
          </View>

          <View style={styles.figureBox}>
            <View style={styles.figurePanel}>
              {/* NB: AnatomyFigure må støtte "data" (hvis din gjør det) –
                  hvis ikke, si ifra og jeg tilpasser AnatomyFigure med MINSTE endring. */}
              <AnatomyFigure
                gender={gender}
                side="front"
                scale={1.1}
                outline="subtle"
                data={frontData}
              />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.col}>
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>Bakside</Text>
          </View>

          <View style={styles.figureBox}>
            <View style={styles.figurePanel}>
              <AnatomyFigure
                gender={gender}
                side="back"
                scale={1.1}
                outline="subtle"
                data={backData}
              />
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    padding: 14,
    backgroundColor: "rgba(2,6,23,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginTop: 14,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  glow: {
    position: "absolute",
    top: -40,
    left: -40,
    right: -40,
    height: 220,
    borderRadius: 999,
    opacity: 0.65,
  },
  header: { marginBottom: 10 },
  title: {
    color: "rgba(229,236,255,0.95)",
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  col: { flex: 1, alignItems: "center" },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 10,
    borderRadius: 1,
  },
  labelPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 8,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(148,163,184,0.85)",
  },
  figureBox: {
    width: "100%",
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  figurePanel: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "rgba(2,6,23,0.30)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
