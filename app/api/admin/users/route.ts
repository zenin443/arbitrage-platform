import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { logAdminAction, getClientIp } from '@/lib/admin/audit';

/**
 * GET /api/admin/users
 * List all users with subscription info, session counts, and activity.
 * Supports ?search=, ?plan=, ?status=, ?page=, ?limit= query params.
 */
export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? '';
  const planFilter = searchParams.get('plan');
  const statusFilter = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (planFilter) {
      conditions.push(`s.plan_tier = $${paramIdx}`);
      params.push(planFilter);
      paramIdx++;
    }
    if (statusFilter === 'active') {
      conditions.push(`u.is_active = true`);
    } else if (statusFilter === 'inactive') {
      conditions.push(`u.is_active = false`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ${where}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.last_login_at,
        s.plan_tier,
        s.status as sub_status,
        s.stripe_customer_id,
        s.stripe_subscription_id,
        s.current_period_end,
        (SELECT COUNT(*) FROM sessions ses WHERE ses.user_id = u.id AND ses.expires_at > NOW()) as active_sessions
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    logAdminAction({
      userId: admin.userId, email: admin.email, method: 'GET',
      path: req.nextUrl.pathname, statusCode: 200,
      ip: getClientIp(req), userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      users: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[api/admin/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
