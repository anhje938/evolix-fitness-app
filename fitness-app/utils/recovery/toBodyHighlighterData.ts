// utils/recovery/toBodyHighlighterData.ts
import type { RecoveryEntry, RecoveryMap } from "@/types/recovery";
import { muscleToSlug } from "@/utils/recovery/muscleToSlug";

// Minimal type for react-native-body-highlighter
export type BodyPartObject = {
  slug: string;
  intensity?: number; // 1..N (libben bruker colors-arrayet)
  side?: "left" | "right";
  color?: string;
};

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function hoursSinceNow(isoUtc: string): number {
  const t = new Date(isoUtc).getTime();
  if (!Number.isFinite(t)) return Number.NaN;
  return (Date.now() - t) / (1000 * 60 * 60);
}

/**
 * RecoveryEntry kan være enten:
 * - number (0..1)
 * - object med { score } eller { recovery } eller { value }
 * Vi håndterer alle uten å krangle med TS.
 */
function getRecoveryScore(entry: RecoveryEntry | undefined): number {
  if (entry == null) return 1;

  // V1: number 0..1
  if (typeof entry === "number") return clamp01(entry);

  // V2: object-varianter
  if (typeof entry === "object") {
    const anyEntry = entry as any;

    // Prefer time-based recovery if we have stimulus timestamp + readiness window.
    // This keeps heatmap color aligned with "Estimert klar" in popup.
    const lastStimulusAtUtc =
      typeof anyEntry.lastStimulusAtUtc === "string"
        ? anyEntry.lastStimulusAtUtc
        : typeof anyEntry.lastTrainedAtUtc === "string"
        ? anyEntry.lastTrainedAtUtc
        : null;
    const readinessHours = Number(anyEntry.readinessHours);
    if (lastStimulusAtUtc && Number.isFinite(readinessHours) && readinessHours > 0) {
      const elapsedHours = hoursSinceNow(lastStimulusAtUtc);
      if (Number.isFinite(elapsedHours)) return clamp01(elapsedHours / readinessHours);
    }

    if (typeof anyEntry.score === "number") return clamp01(anyEntry.score);
    if (typeof anyEntry.recovery === "number") return clamp01(anyEntry.recovery);
    if (typeof anyEntry.value === "number") return clamp01(anyEntry.value);
  }

  return 1;
}

function readinessToIntensity(recovery01: number): number {
  const r = clamp01(recovery01);
  // 1..101 where 1=red and 101=green, for smooth gradient.
  return Math.round(r * 100) + 1;
}

export function toBodyHighlighterData(map: RecoveryMap): BodyPartObject[] {
  const recoveryBySlug = new Map<string, number>();

  // RecoveryMap keys er muskel-navn. Vi hopper over ALL.
  for (const [muscle, entry] of Object.entries(map)) {
    if (muscle === "ALL") continue;

    const recovery = getRecoveryScore(entry as any);

    const slug = muscleToSlug(muscle as any);
    if (!slug) continue;

    // Flere muskler kan mappe til samme slug (f.eks. ulike skulderhoder).
    // Vi viser den minst recovered varianten for den kroppsdelen.
    const prev = recoveryBySlug.get(slug);
    if (prev == null) recoveryBySlug.set(slug, recovery);
    else recoveryBySlug.set(slug, Math.min(prev, recovery));
  }

  const out: BodyPartObject[] = [];
  for (const [slug, recovery] of recoveryBySlug.entries()) {
    out.push({ slug, intensity: readinessToIntensity(recovery) });
  }

  return out;
}
