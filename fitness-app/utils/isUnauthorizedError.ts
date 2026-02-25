export function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const msg = error.message.toLowerCase();
  return /\b401\b/.test(msg) || msg.includes("unauthorized");
}
