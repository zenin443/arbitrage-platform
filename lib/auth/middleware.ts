import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './tokens';

interface AuthUser {
  userId: string;
  email: string;
  plan: string;
  role: string;
}

// DEV_AUDIT_MODE: suspends auth enforcement for raw development auditing.
// Active ONLY when DEV_AUDIT_MODE=true AND NODE_ENV !== 'production'.
// Flip DEV_AUDIT_MODE=false (or remove it) to restore full security.
const DEV_AUDIT_MODE = process.env.DEV_AUDIT_MODE === 'true';

const DEV_ADMIN_USER: AuthUser = {
  userId: 'dev-audit-bypass',
  email: 'dev@arbitrance.internal',
  plan: 'institutional',
  role: 'admin',
};

export function getAuthUser(req: NextRequest): AuthUser | null {
  if (DEV_AUDIT_MODE) return DEV_ADMIN_USER;
  try {
    let user: AuthUser | null = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      user = verifyAccessToken(authHeader.substring(7));
    } else {
      const token = req.cookies.get('access_token')?.value;
      if (token) user = verifyAccessToken(token);
    }

    // Admin role gets institutional plan server-side so every API route
    // automatically serves full data without per-route role checks.
    if (user?.role === 'admin') {
      return { ...user, plan: 'institutional' };
    }

    return user;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): AuthUser | NextResponse {
  if (DEV_AUDIT_MODE) return DEV_ADMIN_USER;
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return user;
}

export function requireAdmin(req: NextRequest): AuthUser | NextResponse {
  if (DEV_AUDIT_MODE) return DEV_ADMIN_USER;
  const user = getAuthUser(req);
  if (!user) {
    console.warn(`[admin/access] REJECTED unauthenticated — ${req.method} ${req.nextUrl.pathname} from ${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}`);
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    console.warn(`[admin/access] REJECTED non-admin (role: ${user.role}, user: ${user.userId}) — ${req.method} ${req.nextUrl.pathname}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}
