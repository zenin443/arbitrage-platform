'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LockIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_PRICES } from '@/lib/payments/config';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

const PLAN_DISPLAY: Record<string, { label: string; color: string; border: string; bg: string }> = {
  trader:        { label: 'Trader',        color: 'text-[#388BFD]', border: 'border-[#388BFD]/50', bg: 'bg-[#388BFD]/10' },
  pro:           { label: 'Pro',           color: 'text-[#D29922]', border: 'border-[#D29922]/50', bg: 'bg-[#D29922]/10' },
  institutional: { label: 'Institutional', color: 'text-[#A371F7]', border: 'border-[#A371F7]/50', bg: 'bg-[#A371F7]/10' },
};

interface UpgradePromptProps {
  feature: string;
  requiredPlan: 'trader' | 'pro' | 'institutional';
  onSuccess?: () => void;
  className?: string;
  /** If true, renders as an inline card rather than a full overlay */
  inline?: boolean;
}

export default function UpgradePrompt({ feature, requiredPlan, onSuccess, className = '', inline = false }: UpgradePromptProps) {
  const { user, accessToken } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const pd = PLAN_DISPLAY[requiredPlan] ?? PLAN_DISPLAY.pro;
  const price = PLAN_PRICES[requiredPlan];

  function handleUpgradeClick() {
    if (!user) {
      window.location.href = `/signup?plan=${requiredPlan}`;
      return;
    }
    setShowModal(true);
  }

  const card = (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 bg-[#0D1117] border ${pd.border} rounded-lg text-center ${inline ? '' : 'w-full h-full'} ${className}`}>
      <div className={`p-2.5 rounded-full ${pd.bg} border ${pd.border}`}>
        <LockIcon className={`h-5 w-5 ${pd.color}`} />
      </div>

      <div>
        <p className={`text-[13px] font-mono font-semibold ${pd.color} uppercase tracking-wider`}>
          {pd.label} Plan Required
        </p>
        <p className="text-[11px] font-mono text-[#8B949E] mt-1">
          Unlock <span className="text-[#C9D1D9]">{feature}</span> with {pd.label}
        </p>
      </div>

      {price && (
        <p className={`text-[11px] font-mono ${pd.color}`}>
          ${price.toFixed(2)}<span className="text-[#484F58]">/month</span>
        </p>
      )}

      <div className="flex flex-col items-center gap-1.5 w-full max-w-[200px]">
        <button
          onClick={handleUpgradeClick}
          className="w-full py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[12px] font-mono font-semibold uppercase tracking-wider transition-colors"
        >
          Upgrade to {pd.label}
        </button>
        <Link
          href="/pricing"
          className="text-[11px] font-mono text-[#484F58] hover:text-[#8B949E] transition-colors"
        >
          Learn more →
        </Link>
      </div>

      {showModal && (
        <PaymentModal
          plan={requiredPlan}
          accessToken={accessToken}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onSuccess?.();
          }}
        />
      )}
    </div>
  );

  if (inline) return card;

  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm bg-[#0D1117]/80 ${className}`}>
      {card}
    </div>
  );
}
