// A small in-memory rate limit: at most LIMIT requests per WINDOW from one address.
// It lives in this server process only. On Vercel each running copy of the
// function has its own count, so this slows abuse down but is not a hard cap.
// The hard cap is the spend limit set with the model provider.
const LIMIT = 10;
const WINDOW_MS = 60_000;

const recentRequests = new Map<string, number[]>();

export function allowRequest(address: string, now = Date.now()): boolean {
  const recent = (recentRequests.get(address) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) {
    recentRequests.set(address, recent);
    return false;
  }
  recent.push(now);
  recentRequests.set(address, recent);
  return true;
}
