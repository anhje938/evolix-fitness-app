export function formatDuration(
  startedAtUtc?: string | null,
  finishedAtUtc?: string | null
) {
  if (!startedAtUtc) return "0:00";

  const start = new Date(startedAtUtc).getTime();
  const end = finishedAtUtc ? new Date(finishedAtUtc).getTime() : Date.now();

  const ms = Math.max(0, end - start);
  const totalSeconds = Math.floor(ms / 1000);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
