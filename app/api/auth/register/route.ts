import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/tokens';
import { checkRegisterRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { registerSchema, formatZodError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkRegisterRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts', retryAfter: rateCheck.retryAfter },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  let client;
  try {
    client = await pool.connect();
  } catch (err: unknown) {
    console.error('Register DB connect error:', err);
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email.toLowerCase(), hashedPassword, name.trim()]
    );
    const user = userResult.rows[0];

    await client.query(
      'INSERT INTO subscriptions (user_id, plan_tier, status) VALUES ($1, $2, $3)',
      [user.id, 'free', 'active']
    );

    await client.query(
      'INSERT INTO user_preferences (user_id) VALUES ($1)',
      [user.id]
    );

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: 'free',
    });
    const refreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const userAgent = req.headers.get('user-agent') ?? '';

    await client.query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [user.id, refreshToken, expiresAt, ip, userAgent]
    );

    await client.query('COMMIT');

    const response = NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, plan: 'free' }, accessToken },
      { status: 201 }
    );

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });

    return response;
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
