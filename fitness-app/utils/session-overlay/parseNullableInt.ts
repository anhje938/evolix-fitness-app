export function parseNullableInt(txt: string): number | null {
  const cleaned = txt.trim();
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}