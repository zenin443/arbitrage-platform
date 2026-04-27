import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { CHAINS, PLAN_PRICES, SERVER_PAYMENT_WALLET, SERVER_SOLANA_WALLET } from '@/lib/payments/config';

const VALID_PLANS = ['trader', 'pro', 'institutional'] as const;
const VALID_CURRENCIES = ['USDC', 'USDT'] as const;
const VALID_CHAINS = Object.keys(CHAINS);

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { plan, chain, currency, paymentMethod = 'wallet' } = body as {
      plan: string;
      chain: string;
      currency: string;
      paymentMethod?: string;
    };

    if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
      return NextResponse.json({ error: 'Invalid plan. Must be trader, pro, or institutional.' }, { status: 400 });
    }
    if (!VALID_CURRENCIES.includes(currency as typeof VALID_CURRENCIES[number])) {
      return NextResponse.json({ error: 'Invalid currency. Must be USDC or USDT.' }, { status: 400 });
    }
    if (!VALID_CHAINS.includes(chain)) {
      return NextResponse.json({ error: `Invalid chain. Must be one of: ${VALID_CHAINS.join(', ')}` }, { status: 400 });
    }

    const chainConfig = CHAINS[chain];

    // Validate currency availability on chosen chain
    if (currency === 'USDT' && !chainConfig.usdtContract) {
      return NextResponse.json({ error: `USDT not available on ${chainConfig.name}. Use USDC.` }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const isSolana = chain === 'solana';
    const recipientAddress = isSolana ? SERVER_SOLANA_WALLET : SERVER_PAYMENT_WALLET;

    if (!recipientAddress) {
      return NextResponse.json(
        { error: 'Payment wallet not configured. Contact support.' },
        { status: 503 }
      );
    }

    const tokenContract = currency === 'USDC' ? chainConfig.usdcContract : chainConfig.usdtContract;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const result = await pool.query(
      `INSERT INTO payments (user_id, plan_tier, amount, currency, chain, payment_method, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING id, expires_at`,
      [userId, plan, amount, currency, chain, paymentMethod, expiresAt]
    );

    const payment = result.rows[0];

    return NextResponse.json({
      paymentId: payment.id,
      amount,
      currency,
      chain,
      chainName: chainConfig.name,
      recipientAddress,
      tokenContract,
      explorerUrl: chainConfig.explorerUrl,
      expiresAt: payment.expires_at,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Payment create error:', error);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
