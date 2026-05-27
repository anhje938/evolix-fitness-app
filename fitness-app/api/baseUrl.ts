import Constants from "expo-constants";
import { resolveApiBaseUrl } from "./baseUrlConfig";

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  Constants.appOwnership
);
