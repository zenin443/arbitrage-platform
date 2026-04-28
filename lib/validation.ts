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
    .min(10, 'txHash too short')
    .max(255, 'txHash too long'),
  fromAddress: z.string().optional(),
});

// ── Wallet auth schema ────────────────────────────────────────────────────────

export const walletAuthSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address format'),
  signature: z
    .string()
    .min(10, 'Signature too short'),
  message: z
    .string()
    .min(1, 'Message is required'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(issue => issue.message).join('; ');
}

type ValidateSuccess<T> = { success: true; data: T };
type ValidateFailure    = { success: false; error: string };

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidateSuccess<T> | ValidateFailure {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodError(result.error) };
}

export type RegisterInput       = z.infer<typeof registerSchema>;
export type LoginInput          = z.infer<typeof loginSchema>;
export type PaymentCreateInput  = z.infer<typeof paymentCreateSchema>;
export type PaymentConfirmInput = z.infer<typeof paymentConfirmSchema>;
export type WalletAuthInput     = z.infer<typeof walletAuthSchema>;
