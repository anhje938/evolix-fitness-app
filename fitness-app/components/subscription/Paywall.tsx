import { hasPremiumAccess, isPurchaseCancelledError } from "@/services/subscriptionService";
import { useSubscription } from "@/context/SubscriptionProvider";
import { typography } from "@/config/typography";
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
import type { PurchasesPackage } from "react-native-purchases";

const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ?? "https://evolix.no/terms";
const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://evolix.no/privacy";

type Props = {
  visible: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
  mandatory?: boolean;
  source?: string;
};

function packageLabel(packageToShow: PurchasesPackage) {
  if (packageToShow.packageType === "ANNUAL") return "Årlig";
  if (packageToShow.packageType === "MONTHLY") return "Månedlig";
  return packageToShow.product.title || "Premium";
}

function packageSubtitle(packageToShow: PurchasesPackage) {
  if (packageToShow.packageType === "ANNUAL") {
    return packageToShow.product.pricePerMonthString
      ? `${packageToShow.product.pricePerMonthString} per måned`
      : "Betales årlig";
  }

  if (packageToShow.packageType === "MONTHLY") return "Fleksibelt abonnement";
  return packageToShow.product.description || "Lås opp Premium";
}

function logOfferingsDebug(packagesToLog: PurchasesPackage[], offeringId?: string) {
  if (!__DEV__) return;

  console.log("[Paywall] RevenueCat offering", {
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

export function Paywall({
  visible,
  onClose,
  onUnlocked,
  mandatory = false,
}: Props) {
  const subscription = useSubscription();
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
        const offerings = await subscription.getOfferings();
        if (cancelled) return;

        const current = offerings.current;
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
          setMessage("Fant ingen aktive produkter i RevenueCat.");
        }
      } catch {
        if (!cancelled) {
          setMessage("Kunne ikke hente pris. Prøv igjen om litt.");
        }
      } finally {
        if (!cancelled) setIsLoadingOfferings(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subscription, visible]);

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
      const customerInfo = await subscription.purchasePackage(selectedPackage);
      if (hasPremiumAccess(customerInfo)) {
        onUnlocked?.();
        onClose();
        return;
      }

      setMessage("Kjøpet ble registrert, men Premium er ikke aktiv ennå.");
    } catch (error) {
      if (!isPurchaseCancelledError(error)) {
        setMessage("Kjøpet kunne ikke fullføres. Prøv igjen.");
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
      const result = await subscription.restorePurchases();
      if (result.status === "restored") {
        onUnlocked?.();
        onClose();
        return;
      }

      setMessage("Fant ingen aktive kjøp.");
    } catch {
      setMessage("Kunne ikke gjenopprette kjøp. Prøv igjen.");
    } finally {
      setIsRestoring(false);
    }
  };

  const isBusy = isPurchasing || isRestoring || isLoadingOfferings;

  return (
    <Modal visible={visible} animationType="fade" transparent>
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

          <Text style={[typography.h2, styles.title]}>EvoliX Premium</Text>
          <Text style={[typography.body, styles.body]}>
            Lås opp alle coacher, ukesrapport og subscriber-programmer.
          </Text>

          <View style={styles.benefits}>
            {[
              "Matcoach og vektcoach",
              "Treningscoach i øktloggingen",
              "Premium treningsprogrammer",
            ].map((item) => (
              <View key={item} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#67E8F9" />
                <Text style={styles.benefitText}>{item}</Text>
              </View>
            ))}
          </View>

          {isLoadingOfferings ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#67E8F9" />
              <Text style={styles.loadingText}>Henter pris</Text>
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
                      <Text style={styles.packageTitle}>{packageLabel(item)}</Text>
                      <Text style={styles.packageSub}>{packageSubtitle(item)}</Text>
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
                  ? `Fortsett med ${selectedPackage.product.priceString}`
                  : "Ikke tilgjengelig"}
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
              {isRestoring ? "Gjenoppretter..." : "Gjenopprett kjøp"}
            </Text>
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={styles.legalLink}>Vilkår</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.legalLink}>Personvern</Text>
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
    marginTop: 16,
    color: "rgba(248,250,252,0.98)",
  },
  body: {
    marginTop: 8,
    color: "rgba(203,213,225,0.92)",
    fontSize: 13,
    lineHeight: 19,
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
