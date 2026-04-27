import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { paymentId, txHash, fromAddress } = body as {
      paymentId: string;
      txHash: string;
      fromAddress?: string;
    };

    if (!paymentId || !txHash) {
      return NextResponse.json({ error: 'Missing paymentId or txHash' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch the payment and verify ownership
      const paymentRes = await client.query(
        `SELECT id, user_id, plan_tier, amount, currency, chain, status, expires_at
         FROM payments
         WHERE id = $1 AND user_id = $2`,
        [paymentId, userId]
      );

      if (paymentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      const payment = paymentRes.rows[0];

      if (payment.status === 'confirmed') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Payment already confirmed' }, { status: 409 });
      }

      if (payment.status === 'expired' || new Date(payment.expires_at) < new Date()) {
        await client.query('UPDATE payments SET status = $1 WHERE id = $2', ['expired', paymentId]);
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Payment has expired' }, { status: 410 });
      }

      // TODO: Add on-chain verification here
      // - For EVM: use viem to call the chain's RPC and verify the tx receipt
      //   shows a Transfer event from fromAddress to recipientAddress for the correct amount
      // - For Solana: verify the SPL token transfer on-chain
      // For now, auto-confirm on submission

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Update payment to confirmed
      await client.query(
        `UPDATE payments
         SET status = 'confirmed', tx_hash = $1, from_address = $2,
             confirmed_at = $3, period_start = $3, period_end = $4
         WHERE id = $5`,
        [txHash, fromAddress || null, now, periodEnd, paymentId]
      );

      // Update active subscription or insert a new one
      const updateRes = await client.query(
        `UPDATE subscriptions
         SET plan_tier = $1, status = 'active',
             current_period_start = $2, current_period_end = $3, updated_at = NOW()
         WHERE user_id = $4 AND status = 'active'`,
        [payment.plan_tier, now, periodEnd, userId]
      );

      if ((updateRes.rowCount ?? 0) === 0) {
        await client.query(
          `INSERT INTO subscriptions (user_id, plan_tier, status, current_period_start, current_period_end)
           VALUES ($1, $2, 'active', $3, $4)`,
          [userId, payment.plan_tier, now, periodEnd]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        paymentId,
        planTier: payment.plan_tier,
        periodStart: now,
        periodEnd,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
