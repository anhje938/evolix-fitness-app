import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";

export const REVENUECAT_PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENT_ID ?? "premium";

function getRevenueCatEnvironment() {
  const value = process.env.EXPO_PUBLIC_REVENUECAT_ENV?.trim().toLowerCase();
  return value === "production" ? "production" : "test";
}

let configurePromise: Promise<void> | null = null;

function getRevenueCatApiKey() {
  if (getRevenueCatEnvironment() === "test") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? null;
  }

  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;
  }

  return null;
}

export function configureRevenueCat() {
  if (configurePromise) return configurePromise;

  configurePromise = configureRevenueCatSdk().catch((error: unknown) => {
    configurePromise = null;
    throw error;
  });

  return configurePromise;
}

async function configureRevenueCatSdk() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error(
      getRevenueCatEnvironment() === "test"
        ? "Missing RevenueCat Test Store API key. Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY."
        : `Missing RevenueCat API key for ${Platform.OS}. Set EXPO_PUBLIC_REVENUECAT_${Platform.OS.toUpperCase()}_API_KEY.`
    );
  }

  const isConfigured = await Purchases.isConfigured();
  if (isConfigured) return;

  await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);

  Purchases.configure({
    apiKey,
  });
}

export function hasPremiumAccess(customerInfo: CustomerInfo | null | undefined) {
  return (
    customerInfo?.entitlements.active[REVENUECAT_PREMIUM_ENTITLEMENT_ID]
      ?.isActive === true
  );
}
