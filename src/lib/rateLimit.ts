type HeaderValue = string | string[] | undefined;

type HeaderSource = Headers | Record<string, HeaderValue>;

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(headers: HeaderSource): string {
  const getHeader = (name: string) => {
    if (headers instanceof Headers) return headers.get(name);
    const direct = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(direct) ? direct[0] : direct;
  };

  const forwarded = getHeader("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return getHeader("x-real-ip") || "unknown";
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.max - 1, resetAt: now + options.windowMs };
  }

  entry.count += 1;
  store.set(key, entry);

  const allowed = entry.count <= options.max;
  return {
    allowed,
    remaining: Math.max(0, options.max - entry.count),
    resetAt: entry.resetAt,
  };
}
