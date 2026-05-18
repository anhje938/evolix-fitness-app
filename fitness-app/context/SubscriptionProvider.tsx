import { getAccessTokenUserId } from "@/api/authSession";
import { useAuth } from "@/context/AuthProvider";
import {
  addCustomerInfoListener,
  getCustomerInfo,
  getOfferings as fetchOfferings,
  hasPremiumAccess,
  initializeSubscriptions,
  logInRevenueCat,
  logOutRevenueCat,
  purchasePackage as purchaseRevenueCatPackage,
  restorePurchases as restoreRevenueCatPurchases,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "@/services/subscriptionService";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Linking, Platform, type AppStateStatus } from "react-native";

const PREMIUM_CACHE_KEY = "subscription_premium_cache_v1";
const PREMIUM_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;
const OFFERINGS_CACHE_MAX_AGE_MS = 1000 * 60 * 15;

type PremiumCache = {
  isPremium: boolean;
  checkedAt: number;
  appUserId: string | null;
  managementURL: string | null;
};

type RestoreResult =
  | { status: "restored"; customerInfo: CustomerInfo }
  | { status: "empty"; customerInfo: CustomerInfo };

type SubscriptionContextValue = {
  appUserId: string | null;
  revenueCatAppUserId: string | null;
  customerInfo: CustomerInfo | null;
  isPremium: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  managementURL: string | null;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  getOfferings: () => Promise<PurchasesOfferings>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<RestoreResult>;
  openManageSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined
);

function parsePremiumCache(value: string | null): PremiumCache | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PremiumCache>;
    if (typeof parsed.isPremium !== "boolean") return null;
    if (typeof parsed.checkedAt !== "number") return null;

    return {
      isPremium: parsed.isPremium,
      checkedAt: parsed.checkedAt,
      appUserId: parsed.appUserId ?? null,
      managementURL: parsed.managementURL ?? null,
    };
  } catch {
    return null;
  }
}

function canUseCachedPremium(
  cache: PremiumCache | null,
  appUserId: string | null
) {
  if (!cache?.isPremium) return false;
  if (cache.appUserId !== appUserId) return false;
  return Date.now() - cache.checkedAt <= PREMIUM_CACHE_MAX_AGE_MS;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Kunne ikke oppdatere abonnement.";
}

async function savePremiumCache(
  customerInfo: CustomerInfo,
  appUserId: string | null
) {
  const cache: PremiumCache = {
    isPremium: hasPremiumAccess(customerInfo),
    checkedAt: Date.now(),
    appUserId,
    managementURL: customerInfo.managementURL,
  };

  await SecureStore.setItemAsync(PREMIUM_CACHE_KEY, JSON.stringify(cache));
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { token, authReady } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [cachedPremium, setCachedPremium] = useState(false);
  const [cachedManagementURL, setCachedManagementURL] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const currentRevenueCatUserIdRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<CustomerInfo | null> | null>(null);
  const offeringsCacheRef = useRef<{
    offerings: PurchasesOfferings;
    fetchedAt: number;
  } | null>(null);
  const offeringsPromiseRef = useRef<Promise<PurchasesOfferings> | null>(null);

  const appUserId = useMemo(() => getAccessTokenUserId(token), [token]);
  const livePremium = hasPremiumAccess(customerInfo);
  const isPremium = livePremium || cachedPremium;
  const managementURL =
    customerInfo?.managementURL ?? cachedManagementURL ?? null;
  const revenueCatAppUserId = customerInfo?.originalAppUserId ?? null;

  const applyCustomerInfo = useCallback(
    async (nextCustomerInfo: CustomerInfo, nextAppUserId = appUserId) => {
      setCustomerInfo(nextCustomerInfo);
      setCachedPremium(hasPremiumAccess(nextCustomerInfo));
      setCachedManagementURL(nextCustomerInfo.managementURL);
      await savePremiumCache(nextCustomerInfo, nextAppUserId);
    },
    [appUserId]
  );

  const getCachedOfferings = useCallback(async () => {
    const cached = offeringsCacheRef.current;
    if (
      cached &&
      Date.now() - cached.fetchedAt <= OFFERINGS_CACHE_MAX_AGE_MS
    ) {
      return cached.offerings;
    }

    if (offeringsPromiseRef.current) return offeringsPromiseRef.current;

    offeringsPromiseRef.current = fetchOfferings()
      .then((offerings) => {
        offeringsCacheRef.current = {
          offerings,
          fetchedAt: Date.now(),
        };
        return offerings;
      })
      .finally(() => {
        offeringsPromiseRef.current = null;
      });

    return offeringsPromiseRef.current;
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      setIsLoading(false);
      return null;
    }

    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      setError(null);

      try {
        const nextCustomerInfo = await getCustomerInfo();
        await applyCustomerInfo(nextCustomerInfo);
        return nextCustomerInfo;
      } catch (refreshError) {
        setError(toErrorMessage(refreshError));
        return null;
      } finally {
        setIsLoading(false);
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [applyCustomerInfo]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const stored = parsePremiumCache(
        await SecureStore.getItemAsync(PREMIUM_CACHE_KEY)
      );

      if (!alive) return;

      const canUseCache = canUseCachedPremium(stored, appUserId);
      setCachedPremium(canUseCache);
      setCachedManagementURL(
        stored?.appUserId === appUserId ? stored.managementURL ?? null : null
      );
    })();

    return () => {
      alive = false;
    };
  }, [appUserId]);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    void (async () => {
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await initializeSubscriptions();
        if (cancelled) return;
        setIsInitialized(true);

        let nextCustomerInfo: CustomerInfo | null = null;
        const previousRevenueCatUserId = currentRevenueCatUserIdRef.current;

        if (appUserId && previousRevenueCatUserId !== appUserId) {
          nextCustomerInfo = await logInRevenueCat(appUserId);
          currentRevenueCatUserIdRef.current = appUserId;
        } else if (!appUserId) {
          try {
            nextCustomerInfo = await logOutRevenueCat();
          } catch {
            nextCustomerInfo = await getCustomerInfo();
          }
          currentRevenueCatUserIdRef.current = null;
        } else {
          nextCustomerInfo = await getCustomerInfo();
        }

        if (cancelled) return;

        if (nextCustomerInfo) {
          await applyCustomerInfo(nextCustomerInfo, appUserId);
          if (!hasPremiumAccess(nextCustomerInfo)) {
            void getCachedOfferings().catch(() => undefined);
          }
        }
      } catch (initError) {
        if (!cancelled) setError(toErrorMessage(initError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appUserId, applyCustomerInfo, authReady, getCachedOfferings]);

  useEffect(() => {
    if (!isInitialized) return;

    const removeListener = addCustomerInfoListener((nextCustomerInfo) => {
      void applyCustomerInfo(nextCustomerInfo);
    });

    return removeListener;
  }, [applyCustomerInfo, isInitialized]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        isInitialized &&
        nextState === "active" &&
        previousState !== "active"
      ) {
        void refreshCustomerInfo();
      }
    });

    return () => subscription.remove();
  }, [isInitialized, refreshCustomerInfo]);

  const purchasePackage = useCallback(
    async (packageToPurchase: PurchasesPackage) => {
      setError(null);
      const nextCustomerInfo = await purchaseRevenueCatPackage(packageToPurchase);
      await applyCustomerInfo(nextCustomerInfo);
      return nextCustomerInfo;
    },
    [applyCustomerInfo]
  );

  const restorePurchases = useCallback(async (): Promise<RestoreResult> => {
    setError(null);
    const nextCustomerInfo = await restoreRevenueCatPurchases();
    await applyCustomerInfo(nextCustomerInfo);

    return hasPremiumAccess(nextCustomerInfo)
      ? { status: "restored", customerInfo: nextCustomerInfo }
      : { status: "empty", customerInfo: nextCustomerInfo };
  }, [applyCustomerInfo]);

  const openManageSubscription = useCallback(async () => {
    if (!managementURL) return;
    await Linking.openURL(managementURL);
  }, [managementURL]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      appUserId,
      revenueCatAppUserId,
      customerInfo,
      isPremium,
      isLoading,
      isInitialized,
      error,
      managementURL,
      refreshCustomerInfo,
      getOfferings: getCachedOfferings,
      purchasePackage,
      restorePurchases,
      openManageSubscription,
    }),
    [
      appUserId,
      customerInfo,
      error,
      isInitialized,
      isLoading,
      isPremium,
      managementURL,
      openManageSubscription,
      purchasePackage,
      refreshCustomerInfo,
      restorePurchases,
      revenueCatAppUserId,
      getCachedOfferings,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used inside <SubscriptionProvider>");
  }
  return ctx;
}
