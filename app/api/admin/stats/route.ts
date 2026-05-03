import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';

/**
 * GET /api/admin/stats
 * Aggregate dashboard stats: user count, plan distribution, active sessions, recent signups.
 */
export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const [totals, planDist, recentSignups, sessionCount] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_today
        FROM users
      `),
      pool.query(`
        SELECT
          COALESCE(s.plan_tier, 'free') as plan,
          COUNT(*) as count
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        GROUP BY COALESCE(s.plan_tier, 'free')
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT id, email, name, role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT COUNT(*) as active_sessions
        FROM sessions
        WHERE expires_at > NOW()
      `),
    ]);

    return NextResponse.json({
      totals: totals.rows[0],
      planDistribution: planDist.rows,
      recentSignups: recentSignups.rows,
      activeSessions: parseInt(sessionCount.rows[0].active_sessions, 10),
    });
  } catch (err) {
    console.error('[api/admin/stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
