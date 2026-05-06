import {
  configureRevenueCat,
  hasPremiumAccess,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
} from "@/config/revenueCat";
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

export {
  hasPremiumAccess,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
};

export async function initializeSubscriptions() {
  await configureRevenueCat();
}

export async function getCustomerInfo() {
  await initializeSubscriptions();
  return Purchases.getCustomerInfo();
}

export async function getOfferings() {
  await initializeSubscriptions();
  return Purchases.getOfferings();
}

export async function purchasePackage(packageToPurchase: PurchasesPackage) {
  await initializeSubscriptions();
  const result = await Purchases.purchasePackage(packageToPurchase);
  return result.customerInfo;
}

export async function restorePurchases() {
  await initializeSubscriptions();
  return Purchases.restorePurchases();
}

export async function logInRevenueCat(appUserId: string) {
  await initializeSubscriptions();
  const result = await Purchases.logIn(appUserId);
  return result.customerInfo;
}

export async function logOutRevenueCat() {
  await initializeSubscriptions();
  return Purchases.logOut();
}

export function addCustomerInfoListener(listener: CustomerInfoUpdateListener) {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export function getMonthlyPackage(offerings: PurchasesOfferings | null) {
  const offering = offerings?.current;
  if (!offering) return null;

  return (
    offering.monthly ??
    offering.availablePackages.find(
      (item) => item.packageType === PACKAGE_TYPE.MONTHLY
    ) ??
    null
  );
}

export function getSelectablePackages(offerings: PurchasesOfferings | null) {
  const offering = offerings?.current;
  if (!offering) return [];

  const packages = [offering.monthly, offering.annual].filter(
    (item): item is PurchasesPackage => !!item
  );

  if (packages.length > 0) return packages;
  return offering.availablePackages;
}

export function isPurchaseCancelledError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: unknown;
    userCancelled?: unknown;
  };

  return (
    candidate.userCancelled === true ||
    candidate.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}
