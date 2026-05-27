import { hasPremiumAccess, isPurchaseCancelledError } from "@/services/subscriptionService";
import { useSubscription } from "@/context/SubscriptionProvider";
import { typography } from "@/config/typography";
import { translate, useTranslation, type TranslationKey } from "@/i18n/translations";
import type { AppLanguage } from "@/types/userSettings";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";

const TERMS_URL = "https://evolix.no/terms";
const PRIVACY_URL = "https://evolix.no/privacy";

type Props = {
  visible: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
  mandatory?: boolean;
  source?: string;
};

function premiumPitch(language: AppLanguage) {
  if (language === "en") {
    return {
      eyebrow: "Premium coaching",
      title: "Unlock your monthly progress report",
      body:
        "EvoliX turns food, weight and training logs into a monthly cut, bulk or maintenance analysis with weekly check-ins that keep the plan alive.",
      benefits: [
        "Monthly cut, bulk or maintenance report",
        "EvolIX Week Plan built from your latest logs",
        "Data quality, confidence and concrete recommendations",
      ],
      proof: ["28-day analysis", "Weekly check-ins", "Coach recommendations"],
    };
  }

  return {
    eyebrow: "Premium coaching",
    title: "Lås opp månedsrapporten din",
    body:
      "EvoliX gjør mat, vekt og trening om til en månedlig analyse for cut, bulk eller vedlikehold, med ukentlige innsikter som holder planen levende.",
    benefits: [
      "Månedlig cut-, bulk- eller vedlikeholdsrapport",
      "EvolIX Week Plan bygget fra de nyeste loggene dine",
      "Datakvalitet, sikkerhet og konkrete anbefalinger",
    ],
    proof: ["28-dagers analyse", "Ukentlige innsikter", "Coach-anbefalinger"],
  };
}

function packageLabel(packageToShow: PurchasesPackage, language: AppLanguage) {
  if (packageToShow.packageType === "ANNUAL") {
    return translate(language, "premiumAnnual");
  }
  if (packageToShow.packageType === "MONTHLY") {
    return translate(language, "premiumMonthly");
  }
  return packageToShow.product.title || "Premium";
}

function packageSubtitle(packageToShow: PurchasesPackage, language: AppLanguage) {
  if (packageToShow.packageType === "ANNUAL") {
    return packageToShow.product.pricePerMonthString
      ? translate(language, "premiumPerMonth", {
          price: packageToShow.product.pricePerMonthString,
        })
      : translate(language, "premiumAnnualBilling");
  }

  if (packageToShow.packageType === "MONTHLY") {
    return translate(language, "premiumMonthlyBilling");
  }
  return packageToShow.product.description || translate(language, "premiumUnlock");
}

function billingPeriodLabel(packageToShow: PurchasesPackage): TranslationKey {
  if (packageToShow.packageType === "ANNUAL") return "premiumPeriodYear";
  if (packageToShow.packageType === "MONTHLY") return "premiumPeriodMonth";
  return "premiumPeriod";
}

function renewalDetails(
  packageToShow: PurchasesPackage | null,
  language: AppLanguage
) {
  if (!packageToShow) return null;

  return translate(language, "premiumRenewal", {
    price: packageToShow.product.priceString,
    period: translate(language, billingPeriodLabel(packageToShow)),
  });
}

function logOfferingsDebug(packagesToLog: PurchasesPackage[], offeringId?: string) {
  if (!__DEV__) return;

  if (__DEV__) console.log("[Paywall] RevenueCat offering", {
    offeringId: offeringId ?? null,
    packages: packagesToLog.map((item) => ({
      identifier: item.identifier,
      packageType: item.packageType,
      productId: item.product.identifier,
      title: item.product.title,
      priceString: item.product.priceString,
      price: item.product.price,
      currencyCode: item.product.currencyCode ?? null,
      pricePerMonthString: item.product.pricePerMonthString ?? null,
    })),
  });
}

function pickOffering(offerings: PurchasesOfferings) {
  if (offerings.current) return offerings.current;
  const first = Object.values(offerings.all ?? {})[0] ?? null;
  return first;
}

function describePurchasesError(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    message?: unknown;
    code?: unknown;
    underlyingErrorMessage?: unknown;
    readableErrorCode?: unknown;
  };

  const message =
    typeof candidate.message === "string" ? candidate.message.trim() : "";
  const code =
    typeof candidate.readableErrorCode === "string"
      ? candidate.readableErrorCode.trim()
      : typeof candidate.code === "string"
        ? candidate.code.trim()
        : "";
  const underlying =
    typeof candidate.underlyingErrorMessage === "string"
      ? candidate.underlyingErrorMessage.trim()
      : "";

  const parts = [code, underlying, message].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" | ");
}

export function Paywall({
  visible,
  onClose,
  onUnlocked,
  mandatory = false,
  source,
}: Props) {
  const {
    getOfferings,
    purchasePackage,
    restorePurchases,
  } = useSubscription();
  const { language, t } = useTranslation();
  const pitch = premiumPitch(language);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    void (async () => {
      setIsLoadingOfferings(true);
      setMessage(null);

      try {
        const offerings = await getOfferings();
        if (cancelled) return;

        const current = pickOffering(offerings);
        const selectable = [
          current?.monthly ?? null,
          current?.annual ?? null,
        ].filter((item): item is PurchasesPackage => !!item);

        const nextPackages =
          selectable.length > 0 ? selectable : current?.availablePackages ?? [];

        logOfferingsDebug(nextPackages, current?.identifier);
        setPackages(nextPackages);
        setSelectedPackageId(nextPackages[0]?.identifier ?? null);

        if (!current || nextPackages.length === 0) {
          setMessage(
            t("premiumNoProducts")
          );
        }
      } catch (error) {
        if (!cancelled) {
          const details = describePurchasesError(error);
          if (__DEV__) console.warn("[Paywall] Kunne ikke hente pris", details ?? error);
          setMessage(
            details
              ? `${t("premiumPriceError")} ${details}`
              : t("premiumPriceError")
          );
        }
      } finally {
        if (!cancelled) setIsLoadingOfferings(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getOfferings, t, visible]);

  const selectedPackage = useMemo(
    () =>
      packages.find((item) => item.identifier === selectedPackageId) ??
      packages[0] ??
      null,
    [packages, selectedPackageId]
  );

  const handlePurchase = async () => {
    if (!selectedPackage || isPurchasing) return;

    setIsPurchasing(true);
    setMessage(null);

    try {
      const customerInfo = await purchasePackage(selectedPackage);
      if (hasPremiumAccess(customerInfo)) {
        onUnlocked?.();
        onClose();
        return;
      }

      setMessage(t("premiumPurchaseInactive"));
    } catch (error) {
      if (!isPurchaseCancelledError(error)) {
        setMessage(t("premiumPurchaseFailed"));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;

    setIsRestoring(true);
    setMessage(null);

    try {
      const result = await restorePurchases();
      if (result.status === "restored") {
        onUnlocked?.();
        onClose();
        return;
      }

      setMessage(t("premiumNoPurchases"));
    } catch {
      setMessage(t("premiumRestoreFailed"));
    } finally {
      setIsRestoring(false);
    }
  };

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setMessage(t("settingsTryAgainLater"));
    }
  };

  const isBusy = isPurchasing || isRestoring || isLoadingOfferings;
  const analyticsSource = source ?? "premium";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={[
              "rgba(251,191,36,0.20)",
              "rgba(34,211,238,0.08)",
              "rgba(15,23,42,0.00)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles-outline" size={20} color="#FDE68A" />
            </View>

            {!mandatory ? (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="rgba(226,232,240,0.9)" />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.eyebrow}>{pitch.eyebrow}</Text>
          <Text style={[typography.h2, styles.title]}>{pitch.title}</Text>
          <Text style={[typography.body, styles.body]}>
            {pitch.body}
          </Text>

          <View style={styles.proofRow}>
            {pitch.proof.map((item) => (
              <View key={`${analyticsSource}-${item}`} style={styles.proofPill}>
                <Text style={styles.proofText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.benefits}>
            {pitch.benefits.map((item) => (
              <View key={item} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#67E8F9" />
                <Text style={styles.benefitText}>{item}</Text>
              </View>
            ))}
          </View>

          {isLoadingOfferings ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#67E8F9" />
              <Text style={styles.loadingText}>{t("premiumLoadingPrice")}</Text>
            </View>
          ) : packages.length > 0 ? (
            <View style={styles.packageList}>
              {packages.map((item) => {
                const active = item.identifier === selectedPackage?.identifier;
                return (
                  <Pressable
                    key={item.identifier}
                    onPress={() => setSelectedPackageId(item.identifier)}
                    style={({ pressed }) => [
                      styles.packageRow,
                      active && styles.packageRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.packageCopy}>
                      <Text style={styles.packageTitle}>
                        {packageLabel(item, language)}
                      </Text>
                      <Text style={styles.packageSub}>
                        {packageSubtitle(item, language)}
                      </Text>
                    </View>
                    <Text style={styles.packagePrice}>
                      {item.product.priceString}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {selectedPackage ? (
            <View style={styles.subscriptionInfoBox}>
              <Text style={styles.subscriptionInfoText}>
                {renewalDetails(selectedPackage, language)}
              </Text>
              <Text style={styles.subscriptionInfoText}>
                {t("premiumLegal")}
              </Text>
            </View>
          ) : null}

          <Pressable
            disabled={!selectedPackage || isBusy}
            onPress={handlePurchase}
            style={({ pressed }) => [
              styles.purchaseBtn,
              pressed && !isBusy && styles.pressed,
              (!selectedPackage || isBusy) && styles.disabled,
            ]}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#02111f" />
            ) : (
              <Text style={styles.purchaseText}>
                {selectedPackage
                  ? t("premiumContinueWith", {
                      price: selectedPackage.product.priceString,
                    })
                  : t("commonNotAvailable")}
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={isBusy}
            onPress={handleRestore}
            style={({ pressed }) => [
              styles.restoreBtn,
              pressed && !isBusy && styles.pressed,
            ]}
          >
            <Text style={styles.restoreText}>
              {isRestoring ? t("premiumRestoring") : t("premiumRestore")}
            </Text>
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable onPress={() => void openExternalUrl(TERMS_URL)}>
              <Text style={styles.legalLink}>{t("premiumTerms")}</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable onPress={() => void openExternalUrl(PRIVACY_URL)}>
              <Text style={styles.legalLink}>{t("premiumPrivacy")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.22)",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  title: {
    marginTop: 5,
    color: "rgba(248,250,252,0.98)",
  },
  eyebrow: {
    marginTop: 16,
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  body: {
    marginTop: 8,
    color: "rgba(203,213,225,0.92)",
    fontSize: 13,
    lineHeight: 19,
  },
  proofRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  proofPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.2)",
    backgroundColor: "rgba(8,47,73,0.38)",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  proofText: {
    color: "rgba(219,234,254,0.95)",
    fontSize: 11,
    fontWeight: "800",
  },
  benefits: {
    marginTop: 16,
    gap: 9,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  benefitText: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 13,
    fontWeight: "600",
  },
  loadingBox: {
    marginTop: 16,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: "rgba(203,213,225,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  packageList: {
    marginTop: 16,
    gap: 10,
  },
  packageRow: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.58)",
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  packageRowActive: {
    borderColor: "rgba(103,232,249,0.38)",
    backgroundColor: "rgba(8,47,73,0.48)",
  },
  packageCopy: {
    flex: 1,
    minWidth: 0,
  },
  packageTitle: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 14,
    fontWeight: "800",
  },
  packageSub: {
    marginTop: 3,
    color: "rgba(148,163,184,0.92)",
    fontSize: 11.5,
    lineHeight: 16,
  },
  packagePrice: {
    color: "#FDE68A",
    fontSize: 14,
    fontWeight: "900",
  },
  message: {
    marginTop: 12,
    color: "rgba(254,243,199,0.95)",
    fontSize: 12,
    lineHeight: 17,
  },
  subscriptionInfoBox: {
    marginTop: 12,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  subscriptionInfoText: {
    color: "rgba(203,213,225,0.92)",
    fontSize: 11.5,
    lineHeight: 17,
  },
  purchaseBtn: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(103,232,249,0.96)",
  },
  purchaseText: {
    color: "#02111f",
    fontSize: 14,
    fontWeight: "900",
  },
  restoreBtn: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "700",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  legalLink: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  legalDot: {
    color: "rgba(148,163,184,0.6)",
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
