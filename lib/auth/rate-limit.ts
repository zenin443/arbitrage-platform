interface AttemptRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, AttemptRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkLimit(key: string, max: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= max) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  return checkLimit(`login:${ip}`, 5);
}

export function checkRegisterRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  return checkLimit(`register:${ip}`, 3);
}

export function getClientIp(req: { headers: { get: (name: string) => string | null } }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
