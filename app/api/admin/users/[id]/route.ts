import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { logAdminAction, getClientIp } from '@/lib/admin/audit';

/**
 * GET /api/admin/users/[id]
 * Full user detail: profile, subscription, sessions, recent activity.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;
  const { id } = await params;

  try {
    const userQuery = `
      SELECT
        u.id, u.email, u.name, u.role, u.is_active, u.email_verified,
        u.created_at, u.updated_at, u.last_login_at,
        s.id as sub_id, s.plan_tier, s.status as sub_status,
        s.stripe_customer_id, s.stripe_subscription_id,
        s.current_period_start, s.current_period_end,
        s.created_at as sub_created_at, s.updated_at as sub_updated_at,
        p.default_quote_currency, p.watchlist, p.alert_enabled, p.theme
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE u.id = $1
    `;
    const userResult = await pool.query(userQuery, [id]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessionsQuery = `
      SELECT id, ip_address::text as ip, user_agent, created_at, expires_at,
             CASE WHEN expires_at > NOW() THEN true ELSE false END as is_active
      FROM sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const sessionsResult = await pool.query(sessionsQuery, [id]);

    const paymentsQuery = `
      SELECT id, plan_tier, amount, currency, status, payment_method, created_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    let payments: unknown[] = [];
    try {
      const paymentsResult = await pool.query(paymentsQuery, [id]);
      payments = paymentsResult.rows;
    } catch {
      // payments table may not exist yet
    }

    logAdminAction({
      userId: admin.userId, email: admin.email, method: 'GET',
      path: req.nextUrl.pathname, statusCode: 200,
      ip: getClientIp(req), userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      user: userResult.rows[0],
      sessions: sessionsResult.rows,
      payments,
    });
  } catch (err) {
    console.error('[api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user fields: is_active, role, name.
 * Cannot demote yourself from admin.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (admin.userId === id && body.role && body.role !== 'admin') {
      return NextResponse.json({ error: 'Cannot demote yourself from admin' }, { status: 400 });
    }

    if (typeof body.is_active === 'boolean') {
      updates.push(`is_active = $${paramIdx++}`);
      values.push(body.is_active);
    }
    if (typeof body.role === 'string' && ['user', 'admin'].includes(body.role)) {
      updates.push(`role = $${paramIdx++}`);
      values.push(body.role);
    }
    if (typeof body.name === 'string') {
      updates.push(`name = $${paramIdx++}`);
      values.push(body.name.trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, email, name, role, is_active`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Force logout if deactivated
    if (body.is_active === false) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    }

    logAdminAction({
      userId: admin.userId, email: admin.email, method: 'PATCH',
      path: req.nextUrl.pathname, statusCode: 200,
      requestBody: body, ip: getClientIp(req),
      userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
