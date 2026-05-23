import { AuthRequestError, loginWithApple } from "@/api/auth";
import { useAuth } from "@/context/AuthProvider";
import { useTranslation } from "@/i18n/translations";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";

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

export function useAppleSignIn() {
  const { setAuthSession } = useAuth();
  const { t } = useTranslation();
  const [isAppleSigningIn, setIsAppleSigningIn] = useState(false);

  const signInWithApple = async () => {
    if (isAppleSigningIn) return;

    try {
      if (Platform.OS !== "ios") {
        Alert.alert(
          t("signInAppleUnavailableTitle"),
          t("signInAppleUnavailableBody"),
        );
        return;
      }

      setIsAppleSigningIn(true);

      if (__DEV__ && Constants.appOwnership === "expo") {
        if (__DEV__) {
          console.log(
            "Expo Go detected. Using mock dev login against configured local API.",
          );
        }
        const session = await loginWithApple("mock-user");
        await setAuthSession(session);
        router.replace("/(tabs)/home");
        return;
      }

      const isAppleAuthAvailable = await AppleAuthentication.isAvailableAsync();

      if (!isAppleAuthAvailable) {
        throw new Error(t("signInAppleUnavailableDevice"));
      }

      let identityToken: string | null | undefined;
      let authorizationCode: string | null | undefined;
      let tokenAudience: string | null = null;
      let usesExpoGoDevMock = false;

      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        identityToken = credential.identityToken;
        authorizationCode = credential.authorizationCode;

        const payload = identityToken
          ? decodeAppleJwtPayload(identityToken)
          : null;
        tokenAudience = typeof payload?.aud === "string" ? payload.aud : null;

        if (__DEV__ && identityToken) {
          console.log("Apple credential debug:", {
            hasIdentityToken: Boolean(identityToken),
            hasAuthorizationCode: Boolean(authorizationCode),
            tokenSegmentCount: identityToken.split(".").length,
            credentialUser: credential.user,
            tokenSub: payload?.sub ?? null,
            tokenAud: payload?.aud ?? null,
            tokenIss: payload?.iss ?? null,
            tokenClaimKeys: payload ? Object.keys(payload) : [],
          });
        }
      } catch (error: any) {
        if (error?.code === "ERR_REQUEST_CANCELED") return;
        if (__DEV__) {
          console.log("Apple native sign-in error:", {
            code: error?.code ?? null,
            message: error?.message ?? null,
          });
        }
        throw error;
      }

      if (!identityToken) {
        throw new Error(t("signInMissingIdentityToken"));
      }

      if (!authorizationCode) {
        throw new Error(t("signInMissingAuthorizationCode"));
      }

      if (__DEV__ && tokenAudience === "host.exp.Exponent") {
        usesExpoGoDevMock = true;
        if (__DEV__) {
          console.log(
            "Expo Go detected. Using mock dev login against configured local API.",
          );
        }
      }

      const session = await loginWithApple(
        usesExpoGoDevMock ? "mock-user" : identityToken,
        usesExpoGoDevMock ? null : authorizationCode,
      );
      await setAuthSession(session);
      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const detail =
        error instanceof AuthRequestError
          ? `API ${error.status}: ${error.message}`
          : error instanceof Error
            ? error.message
            : t("commonUnknownError");

      if (__DEV__) console.log("Login error:", detail, error);
      Alert.alert(
        t("signInFailedTitle"),
        __DEV__ ? detail : t("signInFailedBody"),
      );
    } finally {
      setIsAppleSigningIn(false);
    }
  };

  return {
    isAppleSigningIn,
    signInWithApple,
  };
}
