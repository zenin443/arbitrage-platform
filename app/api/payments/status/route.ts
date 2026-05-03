import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await pool.query(
        `SELECT id, plan_tier, amount, currency, chain, payment_method, tx_hash,
                from_address, status, period_start, period_end, created_at,
                confirmed_at, expires_at
         FROM payments
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      return NextResponse.json({ payment: result.rows[0] });
    }

    // Return last 20 payments for the user
    const result = await pool.query(
      `SELECT id, plan_tier, amount, currency, chain, payment_method, tx_hash,
              from_address, status, period_start, period_end, created_at,
              confirmed_at, expires_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    return NextResponse.json({ payments: result.rows });
  } catch (error: unknown) {
    console.error('[api/payments/status] Failed to fetch payment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
