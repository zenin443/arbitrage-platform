import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateAccessToken, verifyRefreshToken } from '@/lib/auth/tokens';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const sessionResult = await client.query(
      'SELECT id FROM sessions WHERE refresh_token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, payload.userId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 401 });
    }

    const userResult = await client.query(
      `SELECT u.id, u.email, COALESCE(s.plan_tier, 'free') AS plan
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const user = userResult.rows[0];
    const accessToken = generateAccessToken({ userId: user.id, email: user.email, plan: user.plan });

    const response = NextResponse.json({ accessToken });
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });
    return response;
  } catch (err) {
    console.error('Refresh error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
