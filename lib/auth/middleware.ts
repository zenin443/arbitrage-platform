import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './tokens';

interface AuthUser {
  userId: string;
  email: string;
  plan: string;
}

export function getAuthUser(req: NextRequest): AuthUser | null {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return verifyAccessToken(token);
    }

    const token = req.cookies.get('access_token')?.value;
    if (token) {
      return verifyAccessToken(token);
    }

    return null;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): AuthUser | NextResponse {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return user;
}
