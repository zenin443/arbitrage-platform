import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/tokens';
import { serialize } from 'cookie';

export async function POST(req: NextRequest) {
  try {
    const { address, signature, message } = await req.json();

    if (!address || !signature || !message) {
      return NextResponse.json({ error: 'Missing address, signature, or message' }, { status: 400 });
    }

    // Verify the signature matches the address
    const { recoverMessageAddress } = await import('viem');
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      let result = await client.query(
        `SELECT u.id, u.email, u.name, u.wallet_address,
                COALESCE(s.plan_tier, 'free') as plan
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         WHERE LOWER(u.wallet_address) = LOWER($1) AND u.is_active = true
         ORDER BY s.created_at DESC LIMIT 1`,
        [address]
      );

      let user;

      if (result.rows.length === 0) {
        await client.query('BEGIN');

        const userResult = await client.query(
          'INSERT INTO users (wallet_address, name) VALUES ($1, $2) RETURNING id, wallet_address, name',
          [address.toLowerCase(), `${address.substring(0, 6)}...${address.substring(38)}`]
        );
        user = userResult.rows[0];

        await client.query(
          'INSERT INTO subscriptions (user_id, plan_tier, status) VALUES ($1, $2, $3)',
          [user.id, 'free', 'active']
        );

        await client.query(
          'INSERT INTO user_preferences (user_id) VALUES ($1)',
          [user.id]
        );

        await client.query('COMMIT');
        user.plan = 'free';
        user.email = null;
      } else {
        user = result.rows[0];
      }

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email || '',
        plan: user.plan || 'free',
      });

      const refreshToken = generateRefreshToken(user.id);

      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await client.query(
        'INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4::inet, $5)',
        [user.id, refreshToken, expiresAt, ip === 'unknown' ? null : ip, userAgent]
      );

      const cookie = serialize('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.wallet_address,
          plan: user.plan,
        },
        accessToken,
      });

      response.headers.set('Set-Cookie', cookie);
      return response;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wallet auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    );
  }
}
