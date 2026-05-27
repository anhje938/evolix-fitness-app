import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { useTranslation } from "@/i18n/translations";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Apple from "../../assets/icons/apple.svg";
import Bicep from "../../assets/icons/bicep.svg";
import Fire from "../../assets/icons/fire.svg";
import Graph from "../../assets/icons/graph.svg";
import Scale from "../../assets/icons/scale.svg";

const LOGO_IMAGE_WIDTH = 270;
const LOGO_IMAGE_HEIGHT = 194;
const TERMS_URL = "https://evolix.no/terms";
const PRIVACY_URL = "https://evolix.no/privacy";

type AuthScreenFrameProps = {
  children: ReactNode;
  compact?: boolean;
  showBackButton?: boolean;
};

export function AuthScreenFrame({
  children,
  compact = false,
  showBackButton = false,
}: AuthScreenFrameProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("commonError"), t("settingsTryAgainLater"));
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, logoRotate]);

  const rotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const features = [
    { Icon: Apple, text: t("signInFeatureFood"), color: "#4ade80" },
    { Icon: Bicep, text: t("signInFeatureWorkout"), color: "#06b6d4" },
    { Icon: Scale, text: t("signInFeatureWeight"), color: "#8b5cf6" },
    { Icon: Graph, text: t("signInFeatureProgress"), color: "#f97316" },
    { Icon: Fire, text: t("signInFeatureCoach"), color: "#f59e0b" },
  ];

  return (
    <LinearGradient
      colors={[newColors.background.primary, newColors.background.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.container, compact && styles.containerCompact]}>
          {showBackButton ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color="rgba(248,250,252,0.96)"
              />
            </Pressable>
          ) : null}

          <View style={styles.bgCircle1} />
          <View style={styles.bgCircle2} />

          {!compact ? (
            <>
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.logoBox,
                    { transform: [{ rotate: rotation }] },
                  ]}
                >
                  <View style={styles.logoGlow} />
                  <Image
                    source={require("../../assets/images/evolix_logo.png")}
                    style={styles.logoImage}
                  />
                </Animated.View>
                <Text style={styles.logoTitle}>EvoliX</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.titleSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.subtitleBadge}>
                  <View style={styles.badgeGlow} />
                  <Text style={[typography.h2, styles.subtitle]}>
                    {t("signInSubtitle")}
                  </Text>
                </View>
              </Animated.View>
            </>
          ) : null}

          {!compact ? (
            <Animated.View
              style={[
                styles.featuresWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.featuresCard}>
                <View style={styles.cardGlass} />

                <View style={styles.featuresList}>
                  {features.map((feature, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.featureItem,
                        {
                          opacity: fadeAnim,
                          transform: [
                            {
                              translateX: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-20, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.featureIconWrap,
                          { backgroundColor: `${feature.color}15` },
                        ]}
                      >
                        <View
                          style={[
                            styles.featureIconGlow,
                            { backgroundColor: `${feature.color}20` },
                          ]}
                        />
                        <feature.Icon height={24} width={24} />
                      </View>

                      <Text style={[typography.body, styles.featureText]}>
                        {feature.text}
                      </Text>

                      <View style={styles.featureArrow}>
                        <View style={styles.arrowLine} />
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            </Animated.View>
          ) : null}

          <View
            style={[styles.flexSpacer, compact && styles.flexSpacerCompact]}
          />

          <Animated.View
            style={[
              styles.contentWrapper,
              compact && styles.contentWrapperCompact,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {children}
          </Animated.View>

          <Animated.View
            style={[
              styles.termsWrapper,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
              },
            ]}
          >
            <Text style={[typography.body, styles.termsText]}>
              {t("signInTermsPrefix")}
              <Text
                style={styles.termsLink}
                onPress={() => {
                  void openExternalUrl(TERMS_URL);
                }}
              >
                {t("signInTerms")}
              </Text>{" "}
              {t("signInAnd")}
              <Text
                style={styles.termsLink}
                onPress={() => {
                  void openExternalUrl(PRIVACY_URL);
                }}
              >
                {t("signInPrivacy")}
              </Text>
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 24,
    alignItems: "center",
  },
  containerCompact: {
    paddingTop: 76,
    paddingBottom: 12,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 46 : 26,
    left: 20,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 10,
  },
  backButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  bgCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(6,182,212,0.05)",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
  },
  bgCircle2: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(139,92,246,0.05)",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
  },
  logoContainer: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    backgroundColor: "rgba(63, 207, 255, 0)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    position: "relative",
    overflow: "hidden",
  },
  logoGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(120, 207, 223, 0)",
  },
  logoImage: {
    width: LOGO_IMAGE_WIDTH,
    height: LOGO_IMAGE_HEIGHT,
  },
  logoTitle: {
    marginTop: -8,
    color: "#F8FAFC",
    fontSize: 23,
    fontWeight: "400",
    letterSpacing: 0,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  subtitleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    position: "relative",
    overflow: "hidden",
  },
  badgeGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,182,212,0.10)",
  },
  subtitle: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
  },
  featuresWrapper: {
    width: "100%",
    flexShrink: 1,
  },
  featuresCard: {
    borderRadius: 16,
    backgroundColor: "rgba(2,6,23,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  featuresList: {
    gap: 9,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 60,
    paddingVertical: 6,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative",
    overflow: "hidden",
  },
  featureIconGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  featureText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
  featureArrow: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLine: {
    width: 12,
    height: 2,
    backgroundColor: "rgba(148,163,184,0.40)",
    borderRadius: 1,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 10,
  },
  flexSpacerCompact: {
    flex: 0,
    minHeight: 0,
  },
  contentWrapper: {
    width: "100%",
    marginBottom: 12,
  },
  contentWrapperCompact: {
    flex: 1,
    justifyContent: "center",
  },
  termsWrapper: {
    width: "100%",
    paddingHorizontal: 10,
  },
  termsText: {
    fontSize: 12,
    textAlign: "center",
    color: "rgba(148,163,184,0.80)",
    lineHeight: 18,
    fontWeight: "500",
  },
  termsLink: {
    color: "#06b6d4",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
