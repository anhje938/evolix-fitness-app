import { AuthRequestError, loginWithApple } from "@/api/auth";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Apple from "../../assets/icons/apple.svg";
import Bicep from "../../assets/icons/bicep.svg";
import Fire from "../../assets/icons/fire.svg";
import Graph from "../../assets/icons/graph.svg";
import IphoneLogo from "../../assets/icons/iphone-logo.svg";
import Scale from "../../assets/icons/scale.svg";

const LOGO_IMAGE_WIDTH = 350;
const LOGO_IMAGE_HEIGHT = 250;

function decodeAppleJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload || typeof globalThis.atob !== "function") return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

export default function SignIn() {
  const { setAuthSession } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

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

  const handleLogin = async () => {
    if (isLoggingIn) return;

    try {
      if (Platform.OS !== "ios") {
        Alert.alert(
          "Ikke tilgjengelig",
          "Apple-innlogging er kun tilgjengelig på iPhone/iPad."
        );
        return;
      }

      setIsLoggingIn(true);

      if (__DEV__ && Constants.appOwnership === "expo") {
        console.log(
          "Expo Go detected. Using mock dev login against configured local API."
        );
        const session = await loginWithApple("mock-user");
        await setAuthSession(session);
        router.replace("/(tabs)/home");
        return;
      }

      let identityToken: string | null | undefined;
      let appleUserId: string | null | undefined;
      let tokenAudience: string | null = null;
      let usesExpoGoDevMock = false;

      try {
        const AppleAuthentication = await import("expo-apple-authentication");
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        identityToken = credential?.identityToken;
        appleUserId = credential?.user;

        const payload = identityToken
          ? decodeAppleJwtPayload(identityToken)
          : null;
        tokenAudience = typeof payload?.aud === "string" ? payload.aud : null;

        if (__DEV__ && identityToken) {
          console.log("Apple credential debug:", {
            hasIdentityToken: Boolean(identityToken),
            tokenSegmentCount: identityToken.split(".").length,
            credentialUser: appleUserId,
            tokenSub: payload?.sub ?? null,
            tokenAud: payload?.aud ?? null,
            tokenIss: payload?.iss ?? null,
            tokenClaimKeys: payload ? Object.keys(payload) : [],
          });
        }
      } catch (error: any) {
        if (error?.code === "ERR_REQUEST_CANCELED") return;
        console.log("Apple native sign-in error:", {
          code: error?.code ?? null,
          message: error?.message ?? null,
        });
        throw error;
      }

      if (!identityToken) {
        throw new Error("Apple Sign-In returnerte ikke identity token.");
      }

      if (__DEV__ && tokenAudience === "host.exp.Exponent") {
        usesExpoGoDevMock = true;
        console.log(
          "Expo Go detected. Using mock dev login against configured local API."
        );
      }

      const session = await loginWithApple(
        usesExpoGoDevMock ? "mock-user" : identityToken
      );
      await setAuthSession(session);
      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const detail =
        error instanceof AuthRequestError
          ? `API ${error.status}: ${error.message}`
          : error instanceof Error
          ? error.message
          : "Ukjent feil";

      console.log("Login error:", detail, error);
      Alert.alert(
        "Innlogging feilet",
        __DEV__ ? detail : "Kunne ikke logge inn med Apple. Prøv igjen."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const rotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const features = [
    { Icon: Apple, text: "Spor mat og kalorier", color: "#4ade80" },
    { Icon: Bicep, text: "Administrer treningsprogram", color: "#06b6d4" },
    { Icon: Scale, text: "Følg din vektutvikling", color: "#8b5cf6" },
    { Icon: Graph, text: "Mål fremgangen din", color: "#f97316" },
    { Icon: Fire, text: "Få smarte mål og anbefalinger", color: "#f59e0b" },
  ];

  return (
    <LinearGradient
      colors={[newColors.background.primary, newColors.background.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* Decorative background elements */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        {/* Logo */}
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
            style={[styles.logoBox, { transform: [{ rotate: rotation }] }]}
          >
            <View style={styles.logoGlow} />
            <Image
              source={require("../../assets/images/evolix_logo.png")}
              style={styles.logoImage}
            />
          </Animated.View>
          <Text style={styles.logoTitle}>EvoliX</Text>
        </Animated.View>

        {/* Title Section */}
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
              Din personlige treningspartner
            </Text>
          </View>
        </Animated.View>

        {/* Features Card */}
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

            {/* Feature List */}
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

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Apple Login Button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleLogin}
            disabled={isLoggingIn}
            activeOpacity={0.9}
          >
            <View style={styles.buttonGlow} />
            <View style={styles.buttonContent}>
              <View style={styles.appleIconWrap}>
                <IphoneLogo height={28} width={28} />
              </View>
              <Text style={[typography.bodyBlack, styles.buttonText]}>
                {isLoggingIn ? "Logger inn..." : "Logg inn med Apple"}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Terms Text */}
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
            Ved å fortsette godtar du våre{" "}
            <Text style={styles.termsLink}>vilkår for bruk</Text> og{" "}
            <Text style={styles.termsLink}>personvernregler</Text>
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 40,
    alignItems: "center",
  },

  // Background decorations
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

  // Logo
  logoContainer: {
    marginBottom: 15,
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
    marginTop: -10,
    color: "#F8FAFC",
    fontSize: 25,
    fontWeight: "400",
    letterSpacing: 0,
  },

  // Title Section
  titleSection: {
    alignItems: "center",
    marginBottom: 16,
  },

  subtitleBadge: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
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
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Features Card
  featuresWrapper: {
    width: "100%",
  },

  featuresCard: {
    borderRadius: 20,
    backgroundColor: "rgba(2,6,23,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 18,
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
    gap: 10,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    paddingVertical: 7,
  },

  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
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

  // Apple Button
  buttonWrapper: {
    width: "100%",
    marginBottom: 12,
  },

  appleButton: {
    height: 58,
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    position: "relative",
    overflow: "hidden",
  },

  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  buttonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  appleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Terms
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
