import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  description: string;
  ctaLabel?: string;
  isLoading?: boolean;
  compact?: boolean;
  onPress: () => void;
};

export function LockedFeatureCard({
  title,
  description,
  ctaLabel = "Lås opp Premium",
  isLoading = false,
  compact = false,
  onPress,
}: Props) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <LinearGradient
        colors={[
          "rgba(251,191,36,0.16)",
          "rgba(34,211,238,0.08)",
          "rgba(15,23,42,0.36)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
          <Ionicons name="lock-closed-outline" size={17} color="#FBBF24" />
        </View>
        <View style={styles.copy}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium</Text>
          </View>
          <Text
            style={[typography.bodyBold, styles.title, compact && styles.titleCompact]}
          >
            {title}
          </Text>
          <Text
            style={[
              typography.body,
              styles.description,
              compact && styles.descriptionCompact,
            ]}
            numberOfLines={compact ? 2 : undefined}
          >
            {description}
          </Text>
        </View>
      </View>

      <Pressable
        disabled={isLoading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.cta,
          compact && styles.ctaCompact,
          pressed && !isLoading && styles.ctaPressed,
          isLoading && styles.ctaDisabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#02111f" />
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={15} color="#02111f" />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.22)",
    backgroundColor: "rgba(15,23,42,0.58)",
    padding: 14,
    gap: 14,
  },
  cardCompact: {
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  headerCompact: {
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.22)",
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.18)",
    marginBottom: 7,
  },
  badgeText: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 15,
    lineHeight: 20,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  description: {
    marginTop: 5,
    color: "rgba(203,213,225,0.9)",
    fontSize: 12.5,
    lineHeight: 18,
  },
  descriptionCompact: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  cta: {
    minHeight: 40,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(103,232,249,0.96)",
  },
  ctaCompact: {
    minHeight: 36,
  },
  ctaPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: "#02111f",
    fontSize: 13,
    fontWeight: "900",
  },
});
