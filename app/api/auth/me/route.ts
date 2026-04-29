import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // DEV_AUDIT_MODE returns a synthetic user — skip DB query (userId is not a real UUID)
  if (process.env.DEV_AUDIT_MODE === 'true' && authUser.userId === 'dev-audit-bypass') {
    return NextResponse.json({
      user: {
        id: 'dev-audit-bypass',
        email: authUser.email,
        name: 'Dev Audit User',
        plan: authUser.plan,
        role: authUser.role,
        walletAddress: null,
        createdAt: new Date().toISOString(),
      },
    });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.id, u.email, u.name, u.wallet_address, u.created_at, u.role, COALESCE(s.plan_tier, 'free') AS plan
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [authUser.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role ?? 'user',
        walletAddress: user.wallet_address,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
