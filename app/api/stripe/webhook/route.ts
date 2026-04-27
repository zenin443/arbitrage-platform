import { NextRequest, NextResponse } from 'next/server';
import stripe, { PRICE_ID_TO_PLAN } from '@/lib/stripe';
import pool from '@/lib/db';
import type { PoolClient } from 'pg';
import type Stripe from 'stripe';

export const config = { api: { bodyParser: false } };

async function upsertSubscription(
  client: PoolClient,
  sub: Stripe.Subscription,
  customerId: string
) {
  const priceId = sub.items.data[0]?.price.id ?? '';
  const plan    = PRICE_ID_TO_PLAN[priceId] ?? 'free';
  const status  = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'canceled';

  await client.query(
    `UPDATE subscriptions
     SET stripe_subscription_id = $1,
         plan_tier               = $2,
         status                  = $3,
         updated_at              = NOW()
     WHERE stripe_customer_id = $4`,
    [sub.id, plan, status, customerId]
  );
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'whsec_REPLACE_ME') {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = await req.arrayBuffer();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const client: PoolClient = await pool.connect();
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.customer) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(client, sub, session.customer as string);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(client, sub, sub.customer as string);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await client.query(
          `UPDATE subscriptions SET plan_tier = 'free', status = 'canceled', updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [sub.customer as string]
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await client.query(
          `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [invoice.customer as string]
        );
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ received: true });
}
