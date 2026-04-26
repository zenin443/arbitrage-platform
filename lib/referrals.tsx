import React from 'react';

interface ExchangeReferral {
  id: string;
  name: string;
  referralUrl: string;
  commission: string;
  shortName: string;
}

const EXCHANGE_REFERRALS: Record<string, ExchangeReferral> = {
  binance: {
    id: 'binance', name: 'Binance',
    referralUrl: 'https://www.binance.com/register?ref=ARBITRANCE',
    commission: '20% fee discount', shortName: 'BIN',
  },
  okx: {
    id: 'okx', name: 'OKX',
    referralUrl: 'https://www.okx.com/join/ARBITRANCE',
    commission: '20% fee rebate', shortName: 'OKX',
  },
  bybit: {
    id: 'bybit', name: 'Bybit',
    referralUrl: 'https://www.bybit.com/register?affiliate_id=ARBITRANCE',
    commission: '30% fee discount', shortName: 'BYB',
  },
  kucoin: {
    id: 'kucoin', name: 'KuCoin',
    referralUrl: 'https://www.kucoin.com/r/ARBITRANCE',
    commission: '20% fee discount', shortName: 'KUC',
  },
  gateio: {
    id: 'gateio', name: 'Gate.io',
    referralUrl: 'https://www.gate.io/signup?ref=ARBITRANCE',
    commission: '30% fee discount', shortName: 'GATE',
  },
  gate: {
    id: 'gateio', name: 'Gate.io',
    referralUrl: 'https://www.gate.io/signup?ref=ARBITRANCE',
    commission: '30% fee discount', shortName: 'GATE',
  },
  bitget: {
    id: 'bitget', name: 'Bitget',
    referralUrl: 'https://www.bitget.com/register?ref=ARBITRANCE',
    commission: '50% fee discount', shortName: 'BTG',
  },
  mexc: {
    id: 'mexc', name: 'MEXC',
    referralUrl: 'https://www.mexc.com/register?inviteCode=ARBITRANCE',
    commission: '40% fee discount', shortName: 'MEXC',
  },
  htx: {
    id: 'htx', name: 'HTX',
    referralUrl: 'https://www.htx.com/register?invite_code=ARBITRANCE',
    commission: '30% fee discount', shortName: 'HTX',
  },
  bingx: {
    id: 'bingx', name: 'BingX',
    referralUrl: 'https://bingx.com/invite/ARBITRANCE',
    commission: '25% fee discount', shortName: 'BNGX',
  },
  coinbase: {
    id: 'coinbase', name: 'Coinbase',
    referralUrl: 'https://www.coinbase.com/join/ARBITRANCE',
    commission: '$10 signup bonus', shortName: 'CB',
  },
  bitfinex: {
    id: 'bitfinex', name: 'Bitfinex',
    referralUrl: 'https://www.bitfinex.com/sign-up?refcode=ARBITRANCE',
    commission: '6% fee discount', shortName: 'BFX',
  },
  kraken: {
    id: 'kraken', name: 'Kraken',
    referralUrl: 'https://www.kraken.com/sign-up?ref=ARBITRANCE',
    commission: 'Fee rebate', shortName: 'KRK',
  },
  cryptocom: {
    id: 'cryptocom', name: 'Crypto.com',
    referralUrl: 'https://crypto.com/exch/ARBITRANCE',
    commission: '$25 signup bonus', shortName: 'CRO',
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter',
    referralUrl: 'https://jup.ag',
    commission: '', shortName: 'JUP',
  },
  uniswap_v3: {
    id: 'uniswap_v3', name: 'Uniswap',
    referralUrl: 'https://app.uniswap.org',
    commission: '', shortName: 'UNI',
  },
  hyperliquid: {
    id: 'hyperliquid', name: 'Hyperliquid',
    referralUrl: 'https://app.hyperliquid.xyz/ref/ARBITRANCE',
    commission: '4% fee discount', shortName: 'HYP',
  },
};

export function getReferral(exchangeId: string): ExchangeReferral | null {
  if (!exchangeId) return null;
  return EXCHANGE_REFERRALS[exchangeId.toLowerCase()] ?? null;
}

export function getReferralUrl(exchangeId: string): string {
  if (!exchangeId) return '#';
  return getReferral(exchangeId)?.referralUrl ?? '#';
}

export function getCommission(exchangeId: string): string {
  if (!exchangeId) return '';
  return getReferral(exchangeId)?.commission ?? '';
}

export function ExchangeLink({
  exchangeId,
  className,
  children,
}: {
  exchangeId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  if (!exchangeId) return <span className={className}>{children ?? 'Unknown'}</span>;
  const ref = getReferral(exchangeId);
  if (!ref) return <span className={className}>{children ?? exchangeId}</span>;
  return (
    <a
      href={ref.referralUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className ?? ''} underline decoration-dotted cursor-pointer hover:opacity-80 transition-opacity`}
      title={`Trade on ${ref.name}${ref.commission ? ' — ' + ref.commission : ''}`}
    >
      {children ?? ref.name}
    </a>
  );
}
