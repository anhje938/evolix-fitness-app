export function parseNullableFloat(txt: string): number | null {
  const cleaned = txt.replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
