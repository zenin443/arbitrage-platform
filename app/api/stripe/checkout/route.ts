import { NextRequest, NextResponse } from 'next/server';
import stripe, { PLAN_PRICE_IDS } from '@/lib/stripe';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let plan: string;
  try {
    const body = await req.json() as { plan?: string };
    plan = body.plan ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId || priceId.startsWith('price_REPLACE')) {
    return NextResponse.json({ error: 'Invalid plan or Stripe not configured' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT u.email, u.name, s.stripe_customer_id FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id WHERE u.id = $1 LIMIT 1',
      [authUser.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { email, name, stripe_customer_id } = result.rows[0] as {
      email: string;
      name: string;
      stripe_customer_id: string | null;
    };

    let customerId = stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, name });
      customerId = customer.id;
      await client.query(
        `UPDATE subscriptions SET stripe_customer_id = $2 WHERE user_id = $1`,
        [authUser.userId, customerId]
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/account?upgraded=1`,
      cancel_url:  `${appUrl}/pricing`,
      metadata: { userId: authUser.userId, plan },
      subscription_data: { metadata: { userId: authUser.userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  } finally {
    client.release();
  }
}
