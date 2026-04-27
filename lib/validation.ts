import { z } from 'zod';

// ── Auth schemas ──────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .max(254, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .max(254, 'Email too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

// ── Payment schemas ───────────────────────────────────────────────────────────

export const paymentCreateSchema = z.object({
  plan: z.enum(['trader', 'pro', 'institutional'], {
    message: 'Plan must be trader, pro, or institutional',
  }),
  chain: z.enum(['base', 'polygon', 'arbitrum', 'ethereum', 'bsc', 'solana'], {
    message: 'Invalid chain',
  }),
  currency: z.enum(['USDC', 'USDT'], {
    message: 'Currency must be USDC or USDT',
  }),
  paymentMethod: z.string().max(50).optional().default('wallet'),
});

export const paymentConfirmSchema = z.object({
  paymentId: z
    .string()
    .uuid('paymentId must be a valid UUID'),
  txHash: z
    .string()
    .min(10, 'txHash too short'),
  fromAddress: z.string().optional(),
});

// ── Helper to format Zod errors into user-friendly messages ──────────────────

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(issue => issue.message).join('; ');
}

export type RegisterInput       = z.infer<typeof registerSchema>;
export type LoginInput          = z.infer<typeof loginSchema>;
export type PaymentCreateInput  = z.infer<typeof paymentCreateSchema>;
export type PaymentConfirmInput = z.infer<typeof paymentConfirmSchema>;
