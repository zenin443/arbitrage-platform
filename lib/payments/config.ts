export interface ChainConfig {
  name: string;
  chainId: number | null; // null for Solana
  nativeCurrency: string;
  usdcContract: string | null;
  usdtContract: string | null;
  explorerUrl: string;
  recommended?: boolean;
}

export const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: 'Base',
    chainId: 8453,
    nativeCurrency: 'ETH',
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdtContract: null, // No native USDT on Base — use USDC only
    explorerUrl: 'https://basescan.org',
    recommended: true,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    nativeCurrency: 'MATIC',
    usdcContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    usdtContract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    explorerUrl: 'https://polygonscan.com',
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    nativeCurrency: 'ETH',
    usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdtContract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    explorerUrl: 'https://arbiscan.io',
  },
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    nativeCurrency: 'ETH',
    usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    explorerUrl: 'https://etherscan.io',
  },
  bsc: {
    name: 'BSC',
    chainId: 56,
    nativeCurrency: 'BNB',
    usdcContract: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    usdtContract: '0x55d398326f99059fF775485246999027B3197955',
    explorerUrl: 'https://bscscan.com',
  },
  solana: {
    name: 'Solana',
    chainId: null,
    nativeCurrency: 'SOL',
    usdcContract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdtContract: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    explorerUrl: 'https://solscan.io',
  },
};

export const CHAIN_ORDER: string[] = ['base', 'polygon', 'arbitrum', 'ethereum', 'bsc', 'solana'];

// Plan prices in USD (paid in USDC/USDT)
export const PLAN_PRICES: Record<string, number> = {
  trader: 19.95,
  pro: 49.95,
  institutional: 499.00,
};

// EVM payment recipient — set NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS in .env.local
export const PAYMENT_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS || '';

// Solana payment recipient — set NEXT_PUBLIC_SOLANA_PAYMENT_WALLET in .env.local
export const SOLANA_PAYMENT_WALLET =
  process.env.NEXT_PUBLIC_SOLANA_PAYMENT_WALLET || '';

// Server-side equivalents (no NEXT_PUBLIC prefix — same values accepted)
export const SERVER_PAYMENT_WALLET =
  process.env.PAYMENT_WALLET_ADDRESS ||
  process.env.NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS ||
  '';

export const SERVER_SOLANA_WALLET =
  process.env.SOLANA_PAYMENT_WALLET ||
  process.env.NEXT_PUBLIC_SOLANA_PAYMENT_WALLET ||
  '';

export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
