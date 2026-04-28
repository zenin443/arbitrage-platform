import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
  const since = searchParams.get('since'); // ISO timestamp or unix ms

  try {
    let query: string;
    let params: unknown[];

    if (since) {
      const sinceDate = isNaN(Number(since))
        ? new Date(since)
        : new Date(Number(since));
      query = `
        SELECT id, user_id, email, method, path, status_code,
               request_body, ip::text, user_agent, created_at
        FROM admin_audit_log
        WHERE created_at > $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params = [sinceDate.toISOString(), limit];
    } else {
      query = `
        SELECT id, user_id, email, method, path, status_code,
               request_body, ip::text, user_agent, created_at
        FROM admin_audit_log
        ORDER BY created_at DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const { rows } = await pool.query(query, params);

    // Log the audit-log read itself
    const { logAdminAction, getClientIp } = await import('@/lib/admin/audit');
    logAdminAction({
      userId: admin.userId,
      email: admin.email,
      method: 'GET',
      path: req.nextUrl.pathname,
      statusCode: 200,
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      entries: rows,
      count: rows.length,
      limit,
    });
  } catch (err) {
    console.error('[api/admin/audit-log]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
