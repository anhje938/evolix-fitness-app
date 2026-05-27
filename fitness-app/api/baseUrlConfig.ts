export const EXPO_GO_DEFAULT_API_BASE_URL = "http://192.168.10.143:8080/api";

export function isExpoGoRuntime(appOwnership: string | null | undefined) {
  return appOwnership === "expo";
}

export function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function resolveApiBaseUrl(
  envValue: string | null | undefined,
  appOwnership: string | null | undefined
) {
  const configuredUrl = envValue?.trim();
  if (configuredUrl) return normalizeApiBaseUrl(configuredUrl);

  if (isExpoGoRuntime(appOwnership)) {
    return normalizeApiBaseUrl(EXPO_GO_DEFAULT_API_BASE_URL);
  }

  throw new Error("Mangler EXPO_PUBLIC_API_BASE_URL.");
}
