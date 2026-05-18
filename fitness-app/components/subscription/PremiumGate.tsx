import { useSubscription } from "@/context/SubscriptionProvider";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LockedFeatureCard } from "./LockedFeatureCard";
import { Paywall } from "./Paywall";

type Props = {
  children: ReactNode;
  featureTitle: string;
  description: string;
  preview?: ReactNode;
  onUnlocked?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PremiumGate({
  children,
  featureTitle,
  description,
  preview,
  onUnlocked,
  style,
}: Props) {
  const { isPremium, isLoading } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    if (!isPremium || !paywallVisible) return;
    setPaywallVisible(false);
    onUnlocked?.();
  }, [isPremium, onUnlocked, paywallVisible]);

  if (isPremium) {
    return style ? <View style={style}>{children}</View> : <>{children}</>;
  }

  return (
    <View style={[styles.lockedWrap, style]}>
      {preview}
      <LockedFeatureCard
        title={featureTitle}
        description={description}
        isLoading={isLoading}
        onPress={() => setPaywallVisible(true)}
      />
      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUnlocked={onUnlocked}
        source={featureTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lockedWrap: {
    gap: 10,
  },
});
