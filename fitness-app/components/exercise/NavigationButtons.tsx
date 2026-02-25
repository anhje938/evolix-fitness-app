import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const colors = {
  background: "rgba(2,6,23,0.20)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  accent: "#06b6d4",
  accentBg: "rgba(6,182,212,0.12)",
  accentBorder: "rgba(6,182,212,0.25)",
  text: "#E5ECFF",
  textMuted: "rgba(148,163,184,0.75)",
  textActive: "#ffffff",
};

type PageKey =
  | "overview"
  | "programs"
  | "workouts"
  | "exercises"
  | "progression";

type NavButtonsProps = {
  page: PageKey;
  setPage: (page: PageKey) => void;
};

const pageIcons: Record<PageKey, keyof typeof Ionicons.glyphMap> = {
  overview: "grid-outline",
  programs: "albums-outline",
  workouts: "fitness-outline",
  exercises: "barbell-outline",
  progression: "trending-up-outline",
};

export default function NavButtons({ page, setPage }: NavButtonsProps) {
  return (
    <View style={styles.wrapper}>
      <NavButton
        label="Oversikt"
        icon={pageIcons.overview}
        active={page === "overview"}
        onPress={() => setPage("overview")}
      />
      <NavButton
        label="Program"
        icon={pageIcons.programs}
        active={page === "programs"}
        onPress={() => setPage("programs")}
      />
      <NavButton
        label="Økter"
        icon={pageIcons.workouts}
        active={page === "workouts"}
        onPress={() => setPage("workouts")}
      />
      <NavButton
        label="Øvelser"
        icon={pageIcons.exercises}
        active={page === "exercises"}
        onPress={() => setPage("exercises")}
      />
      <NavButton
        label="Progresjon"
        icon={pageIcons.progression}
        active={page === "progression"}
        onPress={() => setPage("progression")}
      />
    </View>
  );
}

type ButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
};

function NavButton({ label, icon, active, onPress }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      activeOpacity={0.7}
    >
      {active ? (
        <LinearGradient
          colors={["rgba(6,182,212,0.20)", "rgba(6,182,212,0.12)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeGradient}
        >
          <View style={styles.activeBorder} />
          <View style={styles.buttonContent}>
            <Ionicons name={icon} size={16} color={colors.accent} />
            <Text
              style={[typography.body, styles.activeText]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.buttonContent}>
          <Ionicons name={icon} size={14} color={colors.textMuted} />
          <Text
            style={[typography.body, styles.inactiveText]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 5,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    gap: 5,
    width: "95%",
    alignSelf: "center",
  },

  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    minHeight: 42,
  },
  buttonContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  activeGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },

  activeBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.accentBorder,
  },

  activeText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    color: colors.accent,
    letterSpacing: 0.2,
  },

  inactiveText: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
});
