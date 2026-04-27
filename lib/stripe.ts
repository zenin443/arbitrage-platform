import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key === 'sk_test_REPLACE_ME') {
      throw new Error('STRIPE_SECRET_KEY is not configured. Add your key to .env.local');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    });
  }
  return _stripe;
}

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  trader:        process.env.STRIPE_PRICE_TRADER,
  pro:           process.env.STRIPE_PRICE_PRO,
  institutional: process.env.STRIPE_PRICE_INSTITUTIONAL,
};

export const PRICE_ID_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_TRADER        ?? '']: 'trader',
  [process.env.STRIPE_PRICE_PRO           ?? '']: 'pro',
  [process.env.STRIPE_PRICE_INSTITUTIONAL ?? '']: 'institutional',
};

export default getStripe;
