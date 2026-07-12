type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  familyMediaVaultRateLimit?: Map<string, RateLimitEntry>;
};

const buckets =
  globalForRateLimit.familyMediaVaultRateLimit ??
  new Map<string, RateLimitEntry>();

globalForRateLimit.familyMediaVaultRateLimit = buckets;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
