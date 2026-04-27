import { randomBytes } from 'crypto';

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const store = new Map<string, NonceEntry>();

// Purge expired nonces every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [address, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(address);
  }
}, 10 * 60 * 1000);

/** Issue a fresh nonce for a wallet address. Overwrites any previous nonce. */
export function generateWalletNonce(address: string): string {
  const nonce = randomBytes(16).toString('hex');
  store.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

/**
 * Validate and consume a nonce for a wallet address.
 * Returns true once — the nonce is deleted immediately after validation
 * so the same nonce cannot be reused (replay prevention).
 */
export function consumeWalletNonce(address: string, nonce: string): boolean {
  const entry = store.get(address.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(address.toLowerCase());
    return false;
  }
  if (entry.nonce !== nonce) return false;
  store.delete(address.toLowerCase());
  return true;
}
