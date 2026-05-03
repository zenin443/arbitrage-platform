import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { logAdminAction, getClientIp } from '@/lib/admin/audit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

function internalHeaders() {
  return { 'x-internal-api-key': process.env.INTERNAL_API_SECRET ?? '' };
}

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;

  const res = await fetch(`${BACKEND_URL}/magnus/rate-harvest/trades`, {
    headers: internalHeaders(),
  });
  const statusCode = res.status;

  logAdminAction({
    userId: admin.userId,
    email: admin.email,
    method: 'GET',
    path: req.nextUrl.pathname,
    statusCode,
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent') || '',
  });

  return NextResponse.json(await res.json(), { status: statusCode });
}
