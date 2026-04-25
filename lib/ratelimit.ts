interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const store = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60_000;

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(ip: string): RateLimitResult {
  cleanup();

  const now = Date.now();
  const existing = store.get(ip);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { success: true, remaining: MAX_REQUESTS - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_REQUESTS) {
    const elapsed = now - existing.windowStart;
    const retryAfterSeconds = Math.ceil((WINDOW_MS - elapsed) / 1000);
    return { success: false, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: MAX_REQUESTS - existing.count,
    retryAfterSeconds: 0,
  };
}
