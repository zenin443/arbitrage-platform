import { NextRequest, NextResponse } from 'next/server';
import getStripe from '@/lib/stripe';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1',
      [authUser.userId]
    );

    const customerId = result.rows[0]?.stripe_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await getStripe().billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${appUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  } finally {
    client.release();
  }
}
