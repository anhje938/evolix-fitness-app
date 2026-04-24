const DEFAULT_API_BASE_URL = "http://10.0.0.26:8080/api";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
)
  .trim()
  .replace(/\/+$/, "");
