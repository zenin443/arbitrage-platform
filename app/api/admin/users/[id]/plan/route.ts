import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { logAdminAction, getClientIp } from '@/lib/admin/audit';

const VALID_PLANS = ['free', 'trader', 'pro', 'institutional'] as const;
const VALID_STATUSES = ['active', 'past_due', 'canceled', 'trialing'] as const;

/**
 * PATCH /api/admin/users/[id]/plan
 * Change a user's subscription plan and/or status.
 * Creates a subscription row if one doesn't exist.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const { plan_tier, status } = body;

    if (plan_tier && !VALID_PLANS.includes(plan_tier)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      );
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!plan_tier && !status) {
      return NextResponse.json({ error: 'Provide plan_tier and/or status' }, { status: 400 });
    }

    // Verify user exists
    const userCheck = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upsert subscription
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_tier, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_tier = COALESCE($2, subscriptions.plan_tier),
         status = COALESCE($3, subscriptions.status),
         updated_at = NOW()
       RETURNING id, user_id, plan_tier, status, current_period_end`,
      [id, plan_tier || 'free', status || 'active']
    );

    logAdminAction({
      userId: admin.userId, email: admin.email, method: 'PATCH',
      path: req.nextUrl.pathname, statusCode: 200,
      requestBody: { target_user: id, plan_tier, status },
      ip: getClientIp(req), userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      subscription: result.rows[0],
      message: `Plan updated to ${plan_tier || 'unchanged'}, status ${status || 'unchanged'}`,
    });
  } catch (err) {
    console.error('[api/admin/users/[id]/plan]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
