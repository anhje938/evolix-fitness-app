import { describe, expect, it } from "vitest";
import {
  EXPO_GO_DEFAULT_API_BASE_URL,
  normalizeApiBaseUrl,
  resolveApiBaseUrl,
} from "./baseUrlConfig";

describe("resolveApiBaseUrl", () => {
  it("uses configured URL before runtime fallback", () => {
    expect(resolveApiBaseUrl(" https://evolix.no/api/ ", "standalone")).toBe(
      "https://evolix.no/api"
    );
  });

  it("uses local fallback only in Expo Go", () => {
    expect(resolveApiBaseUrl(undefined, "expo")).toBe(
      EXPO_GO_DEFAULT_API_BASE_URL
    );
  });

  it("throws outside Expo Go when env URL is missing", () => {
    expect(() => resolveApiBaseUrl(undefined, "standalone")).toThrow(
      "Mangler EXPO_PUBLIC_API_BASE_URL."
    );
  });
});

describe("normalizeApiBaseUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(normalizeApiBaseUrl(" https://evolix.no/api/// ")).toBe(
      "https://evolix.no/api"
    );
  });
});
