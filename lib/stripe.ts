import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
});

export default stripe;

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
