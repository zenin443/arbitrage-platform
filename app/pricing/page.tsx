'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ZapIcon, CheckIcon, LockIcon, SettingsIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NavAuthButton from '@/components/NavAuthButton';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'text-[#8B949E]',
    border: 'border-[#21262D]',
    badgeBg: 'bg-[#21262D]',
    badgeText: 'text-[#8B949E]',
    cta: 'Get started free',
    ctaClass: 'bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3]',
    features: [
      '15-second delayed data',
      '5 coins monitored',
      'CEX arbitrage only',
      'Community support',
    ],
    locked: [
      'Real-time data',
      'All gap types',
      'Alerts',
      'Magnus AI',
    ],
  },
  {
    id: 'trader',
    name: 'Trader',
    price: '$19.95',
    period: '/month',
    color: 'text-[#388BFD]',
    border: 'border-[#388BFD]/40',
    badgeBg: 'bg-[#388BFD]/15',
    badgeText: 'text-[#388BFD]',
    cta: 'Start trading',
    ctaClass: 'bg-[#388BFD] hover:bg-[#58a6ff] text-white',
    features: [
      'Real-time data (0ms delay)',
      'All coins monitored',
      'CEX + DEX + Cross-chain arb',
      'Funding rates data',
      'Basic email alerts',
      'No ads',
      'Standard support',
    ],
    locked: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49.95',
    period: '/month',
    highlight: true,
    color: 'text-[#D29922]',
    border: 'border-[#D29922]/40',
    badgeBg: 'bg-[#D29922]/15',
    badgeText: 'text-[#D29922]',
    cta: 'Go Pro',
    ctaClass: 'bg-[#D29922] hover:bg-[#e3b341] text-[#0D1117]',
    features: [
      'Everything in Trader',
      'Magnus AI paper trader',
      'Push + SMS alerts',
      'REST API access',
      'Priority support',
      '99.9% uptime SLA',
    ],
    locked: [],
  },
  {
    id: 'institutional',
    name: 'Institutional',
    price: '$499',
    period: '/month',
    color: 'text-[#A371F7]',
    border: 'border-[#A371F7]/40',
    badgeBg: 'bg-[#A371F7]/15',
    badgeText: 'text-[#A371F7]',
    cta: 'Contact sales',
    ctaClass: 'bg-[#A371F7] hover:bg-[#b992ff] text-white',
    features: [
      'Everything in Pro',
      'Custom REST API',
      'Webhooks',
      'White-label option',
      'Dedicated account manager',
      'Custom SLA',
      'On-premise deployment option',
    ],
    locked: [],
  },
] as const;

type PlanId = 'free' | 'trader' | 'pro' | 'institutional';

export default function PricingPage() {
  const { user, isLoading, accessToken } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState('');

  async function handleCta(planId: PlanId) {
    if (planId === 'free') {
      router.push(user ? '/intelligence' : '/signup');
      return;
    }
    if (planId === 'institutional') {
      window.location.href = 'mailto:sales@arbitrance.io?subject=Institutional%20Plan';
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setError('');
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Stripe is not configured yet. Add your price IDs to .env.local.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const currentPlan = user?.plan ?? 'free';

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      {/* Nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-[13px] font-medium text-[#388BFD]">Arbitrage Terminal</span>
          <span className="text-[#484F58] select-none">|</span>
          <span className="text-[11px] text-[#484F58] font-mono">v0.8.0</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <div className="flex items-center gap-1 mr-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          <Link href="/intelligence" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">Intelligence</Link>
          <Link href="/magnus" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">Magnus</Link>
          <Link href="/funding-rates" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">Funding Rates</Link>
          <Link href="/settings" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="Settings">
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
          <NavAuthButton />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-[22px] font-mono font-semibold text-[#E6EDF3] tracking-tight">
              Choose your edge
            </h1>
            <p className="text-[13px] font-mono text-[#8B949E] mt-2">
              Real-time arbitrage intelligence. Cancel anytime.
            </p>
            {!isLoading && user && (
              <p className="text-[11px] font-mono text-[#484F58] mt-1">
                Currently on <span className="text-[#E6EDF3] font-semibold uppercase">{currentPlan}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="max-w-md mx-auto mb-6 text-[12px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* Plan grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const isCurrent = currentPlan.toLowerCase() === plan.id;
              const isHighlight = 'highlight' in plan && plan.highlight;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col bg-[#161B22] border rounded-lg overflow-hidden transition-colors ${plan.border} ${isHighlight ? 'ring-1 ring-[#D29922]/30' : ''}`}
                >
                  {isHighlight && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D29922] to-transparent" />
                  )}

                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-[#21262D]">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded border ${plan.badgeBg} ${plan.badgeText} border-current/30`}>
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 rounded px-1.5 py-0.5">
                          Current
                        </span>
                      )}
                      {isHighlight && !isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/30 rounded px-1.5 py-0.5">
                          Most popular
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className={`text-[26px] font-mono font-semibold ${plan.color}`}>
                        {plan.price}
                      </span>
                      <span className="text-[11px] font-mono text-[#484F58] mb-1">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1 px-5 py-4 space-y-2">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckIcon className="h-3.5 w-3.5 text-[#3FB950] mt-0.5 flex-shrink-0" />
                        <span className="text-[12px] font-mono text-[#C9D1D9]">{f}</span>
                      </div>
                    ))}
                    {'locked' in plan && plan.locked.map(f => (
                      <div key={f} className="flex items-start gap-2 opacity-40">
                        <LockIcon className="h-3.5 w-3.5 text-[#484F58] mt-0.5 flex-shrink-0" />
                        <span className="text-[12px] font-mono text-[#484F58]">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-5">
                    <button
                      onClick={() => handleCta(plan.id as PlanId)}
                      disabled={isCurrent || loadingPlan === plan.id}
                      className={`w-full rounded px-4 py-2 text-[12px] font-mono font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${plan.ctaClass}`}
                    >
                      {isCurrent
                        ? 'Current plan'
                        : loadingPlan === plan.id
                          ? 'Redirecting…'
                          : plan.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fine print */}
          <p className="text-center text-[11px] font-mono text-[#484F58] mt-8">
            All plans billed monthly. Cancel anytime from your account portal. Prices in USD.
          </p>
        </div>
      </main>
    </div>
  );
}
