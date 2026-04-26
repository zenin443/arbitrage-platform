"use client";

import { useState, useEffect } from 'react';
import { getReferralUrl, getCommission } from '@/lib/referrals';

interface AdZoneProps {
  zone: 'pill' | 'horizontal' | 'contextual-signal' | 'contextual-coin';
  context?: { symbol?: string; exchange?: string };
  className?: string;
}

export default function AdZone({ zone, context, className }: AdZoneProps) {
  const ads = {
    pill: [
      { text: 'Trade on Binance — lowest fees in crypto', url: getReferralUrl('binance') },
      { text: 'Join OKX — 20% fee rebate for new users', url: getReferralUrl('okx') },
      { text: 'Bitget offers 50% fee discount — sign up now', url: getReferralUrl('bitget') },
    ],
    horizontal: [
      { text: 'Powered by Arbitrance — Real-time crypto arbitrage intelligence', url: '/' },
    ],
    'contextual-signal': context?.exchange
      ? [{ text: `Trade ${context.symbol ?? ''} on ${context.exchange} — ${getCommission(context.exchange)}`, url: getReferralUrl(context.exchange) }]
      : [],
    'contextual-coin': context?.symbol
      ? [{ text: `Find the best price for ${context.symbol} across 18 exchanges`, url: '/intelligence' }]
      : [],
  };

  const adList = ads[zone] ?? [];
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    if (adList.length <= 1) return;
    const interval = setInterval(() => setAdIndex((i) => (i + 1) % adList.length), 15000);
    return () => clearInterval(interval);
  }, [adList.length]);

  if (adList.length === 0) return null;

  const currentAd = adList[adIndex % adList.length];

  if (zone === 'pill') {
    return (
      <div className={`flex justify-center my-1 ${className ?? ''}`}>
        <a
          href={currentAd.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-1 bg-[#D29922]/8 border border-[#D29922]/20 rounded-full text-[11px] font-sans hover:bg-[#D29922]/15 transition-colors"
        >
          <span className="text-[#484F58] text-[11px] font-sans">AD</span>
          <span className="text-[#D29922]">{currentAd.text} →</span>
        </a>
      </div>
    );
  }

  if (zone === 'horizontal') {
    return (
      <div className={`mx-3 my-1 px-3 py-1.5 bg-[#388BFD]/4 border border-[#388BFD]/10 rounded flex items-center gap-2 ${className ?? ''}`}>
        <span className="text-[#484F58] text-[11px] font-sans">AD</span>
        <span className="text-[#8B949E] text-[11px] font-sans">{currentAd.text}</span>
      </div>
    );
  }

  return (
    <div className={`px-3 py-1.5 bg-[#3FB950]/4 border-t border-[#3FB950]/10 ${className ?? ''}`}>
      <a
        href={currentAd.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-[11px] font-sans"
      >
        <span className="text-[#484F58] text-[11px] font-sans">AD</span>
        <span className="text-[#3FB950]">{currentAd.text} →</span>
      </a>
    </div>
  );
}
