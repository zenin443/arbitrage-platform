import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/tokens';
import { serialize } from 'cookie';
import { consumeWalletNonce } from '@/lib/auth/wallet-nonces';
import { walletAuthSchema, formatZodError } from '@/lib/validation';

// Expected message format (built by WalletLoginButton):
//   Sign in to Arbitrance Terminal
//
//   Wallet: 0x...
//   Nonce: <hex>
//   Timestamp: <unix-ms>
//
// The nonce is server-issued (GET /api/auth/wallet/nonce?address=...) and
// single-use — consuming it prevents signature replay attacks.
const NONCE_REGEX = /^Nonce: ([a-f0-9]{32})$/m;

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = walletAuthSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { address, signature, message } = parsed.data;

    // Extract and consume nonce — must happen before signature verification
    // so a valid-looking message with a wrong nonce fails fast
    const nonceMatch = message.match(NONCE_REGEX);
    if (!nonceMatch) {
      return NextResponse.json(
        { error: 'Message must include a server-issued nonce (Nonce: <hex>)' },
        { status: 400 }
      );
    }
    const nonce = nonceMatch[1];
    const nonceValid = consumeWalletNonce(address, nonce);
    if (!nonceValid) {
      return NextResponse.json(
        { error: 'Nonce is invalid or expired. Request a fresh nonce and sign again.' },
        { status: 401 }
      );
    }

    // Verify the signature recovers to the claimed address
    const { recoverMessageAddress } = await import('viem');
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Signature does not match address' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
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

      const refreshCookie = serialize('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      const accessCookie = serialize('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60,
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

      response.headers.append('Set-Cookie', refreshCookie);
      response.headers.append('Set-Cookie', accessCookie);
      return response;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error('Wallet auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
