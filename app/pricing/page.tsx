'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, LockIcon, ChevronDownIcon } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

// ── Plan definitions ────────────────────────────────────────────────────────

interface PlanDef {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  period: string;
  tagline: string;
  badge: string | null;
  color: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  accentLine: string | null;
  cta: string;
  ctaClass: string;
  features: string[];
  locked: string[];
  highlight: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'forever',
    tagline: 'Evaluate the platform',
    badge: null,
    color: 'text-[#8B949E]',
    border: 'border-[#21262D]',
    badgeBg: 'bg-[#21262D]',
    badgeText: 'text-[#8B949E]',
    accentLine: null,
    cta: 'Start scanning free',
    ctaClass: 'bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3]',
    highlight: false,
    features: [
      'Delayed data (15s)',
      '5 coins monitored',
      'CEX arbitrage only',
      'Ads shown',
    ],
    locked: [
      'Real-time data',
      'All 128+ coins',
      'DEX + Spot-Futures gaps',
      'Alerts & exports',
      'Magnus AI',
    ],
  },
  {
    id: 'trader',
    name: 'Trader',
    monthlyPrice: 29,
    annualPrice: 23,
    period: '/month',
    tagline: 'For active traders',
    badge: 'Most Popular',
    color: 'text-[#388BFD]',
    border: 'border-[#388BFD]/50',
    badgeBg: 'bg-[#388BFD]/15',
    badgeText: 'text-[#388BFD]',
    accentLine: 'via-[#388BFD]',
    cta: 'Unlock real-time data',
    ctaClass: 'bg-[#388BFD] hover:bg-[#58a6ff] text-white',
    highlight: true,
    features: [
      'Real-time data (0ms delay)',
      'All 128+ coins monitored',
      'CEX + DEX + Cross-chain arb',
      'Funding rates data',
      'Basic email alerts',
      'No ads',
      'CSV export',
    ],
    locked: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 79,
    period: '/month',
    tagline: 'For serious arbitrageurs',
    badge: 'Best Value',
    color: 'text-[#D29922]',
    border: 'border-[#D29922]/50',
    badgeBg: 'bg-[#D29922]/15',
    badgeText: 'text-[#D29922]',
    accentLine: 'via-[#D29922]',
    cta: 'Go Pro',
    ctaClass: 'bg-[#D29922] hover:bg-[#e3b341] text-[#0D1117]',
    highlight: false,
    features: [
      'Everything in Trader',
      'Push + SMS alerts',
      'REST API access',
      'Full data export',
      'Priority support',
      '99.9% uptime SLA',
    ],
    locked: [],
  },
  {
    id: 'magnus',
    name: 'Magnus',
    monthlyPrice: 249,
    annualPrice: 199,
    period: '/month',
    tagline: 'Quant-grade AI trading',
    badge: null,
    color: 'text-[#06B6D4]',
    border: 'border-[#06B6D4]/50',
    badgeBg: 'bg-[#06B6D4]/15',
    badgeText: 'text-[#06B6D4]',
    accentLine: 'via-[#06B6D4]',
    cta: 'Get Magnus AI access',
    ctaClass: 'bg-[#06B6D4] hover:bg-[#22d3ee] text-[#0D1117]',
    highlight: false,
    features: [
      'Everything in Pro',
      'Magnus AI — 9 paper trading bots',
      '15 quant signal sources',
      '98.7% win rate engine',
      'Bot fleet dashboard',
      'Strategy-level analytics',
    ],
    locked: [],
  },
  {
    id: 'institutional',
    name: 'Institutional',
    monthlyPrice: 999,
    annualPrice: 799,
    period: '/month',
    tagline: 'For funds & desks',
    badge: null,
    color: 'text-[#A371F7]',
    border: 'border-[#A371F7]/50',
    badgeBg: 'bg-[#A371F7]/15',
    badgeText: 'text-[#A371F7]',
    accentLine: 'via-[#A371F7]',
    cta: 'Talk to our team',
    ctaClass: 'bg-[#A371F7] hover:bg-[#b992ff] text-white',
    highlight: false,
    features: [
      'Everything in Magnus',
      'Custom API rate limits',
      'Webhook feeds',
      'White-label option',
      'Dedicated account manager',
      'Custom SLA',
    ],
    locked: [],
  },
];

type PlanId = 'free' | 'trader' | 'pro' | 'magnus' | 'institutional';

// ── Feature comparison matrix ────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { label: 'Data latency',       free: '15s delay',  trader: 'Real-time',  pro: 'Real-time',   magnus: 'Real-time',   inst: 'Real-time'   },
  { label: 'Coins monitored',    free: '5',          trader: '128+',       pro: '128+',         magnus: '128+',        inst: '128+' },
  { label: 'CEX arbitrage',      free: '✓',          trader: '✓',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'DEX / Cross-chain',  free: '—',          trader: '✓',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'Spot-Futures arb',   free: '—',          trader: '✓',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'Ads',                free: 'Shown',      trader: 'None',       pro: 'None',         magnus: 'None',        inst: 'None' },
  { label: 'Basic alerts',       free: '—',          trader: '✓',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'Push / SMS alerts',  free: '—',          trader: '—',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'Magnus AI bots',     free: '—',          trader: '—',          pro: '—',            magnus: '9 bots',      inst: '9 bots' },
  { label: 'REST API',           free: '—',          trader: '—',          pro: '✓',            magnus: '✓',           inst: 'Custom limits' },
  { label: 'CSV export',         free: '—',          trader: '✓',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'Full data export',   free: '—',          trader: '—',          pro: '✓',            magnus: '✓',           inst: '✓' },
  { label: 'Webhooks',           free: '—',          trader: '—',          pro: '—',            magnus: '—',           inst: '✓' },
  { label: 'White-label',        free: '—',          trader: '—',          pro: '—',            magnus: '—',           inst: '✓' },
  { label: 'Support',            free: 'Community',  trader: 'Standard',   pro: 'Priority',     magnus: 'Priority',    inst: 'Dedicated' },
];

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'What payment methods do you accept?',
    a: 'We accept crypto (USDC/USDT on Base, Polygon, Arbitrum, Ethereum, BSC, and Solana) and credit/debit cards via Stripe. Crypto payments activate your plan instantly.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no contracts or lock-in periods. Cancel from your account page and your plan remains active until the end of the billing period.',
  },
  {
    q: "What is Magnus AI?",
    a: "Magnus is a fleet of 9 autonomous paper-trading bots that detect and execute arbitrage trades in simulation across 18 exchanges and 128 pairs. The engine maintains a 98.7% win rate across 2,534+ paper trades. Magnus tier users get the full command center with live stats, trade history, and strategy-level analytics.",
  },
  {
    q: 'Do you offer a free trial?',
    a: 'The Free tier gives you permanent access to CEX arbitrage data (with a 15s delay) so you can evaluate the platform before upgrading. No credit card required.',
  },
  {
    q: 'What happens when I upgrade mid-cycle?',
    a: 'Upgrades are prorated. You only pay the difference for the remaining days in your current billing period. Downgrades take effect at the start of the next billing cycle.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { user, isLoading, accessToken, checkAuth } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState('');
  const [cryptoModal, setCryptoModal] = useState<'trader' | 'pro' | 'institutional' | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const currentPlan = user?.plan ?? 'free';

  function displayPrice(plan: PlanDef): string {
    if (plan.monthlyPrice === 0) return '$0';
    const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
    return `$${price}`;
  }

  function annualSavings(plan: PlanDef): number {
    if (plan.monthlyPrice === 0) return 0;
    return (plan.monthlyPrice - plan.annualPrice) * 12;
  }

  async function handleCta(planId: PlanId) {
    setError('');

    if (planId === 'free') {
      router.push(user ? '/intelligence' : '/signup');
      return;
    }

    if (planId === 'institutional') {
      window.location.href = 'mailto:hello@arbitrance.com?subject=Institutional%20Plan%20Inquiry';
      return;
    }

    if (!user) {
      router.push(`/signup?plan=${planId}`);
      return;
    }

    if (planId === 'trader' || planId === 'pro') {
      setCryptoModal(planId);
    }
  }

  async function handlePayWithCard(planId: PlanId) {
    if (!user) {
      router.push(`/login?redirect=/pricing`);
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ plan: planId, cycle: billingCycle }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Stripe is not configured. Use crypto payment instead.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePaymentSuccess() {
    setCryptoModal(null);
    if (checkAuth) await checkAuth();
  }

  function compCellColor(val: string): string {
    if (val === '✓') return 'text-[#3FB950]';
    if (val === '—') return 'text-[#21262D]';
    return 'text-[#E6EDF3]';
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      {/* Nav */}
      <AppHeader activePage="/pricing" />

      <main className="flex-1 px-4 py-12">
        <div className="max-w-6xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#484F58] mb-2">Pricing</p>
            <h1 className="text-[24px] font-mono font-semibold text-[#E6EDF3] tracking-tight uppercase">
              Real-time arbitrage intelligence
            </h1>
            <p className="text-[13px] font-mono text-[#8B949E] mt-2">
              18 exchanges · 128 pairs · 10,000+ gaps/hour · Start free, upgrade when you profit.
            </p>
            {!isLoading && user && (
              <p className="text-[11px] font-mono text-[#484F58] mt-1">
                Currently on <span className="text-[#E6EDF3] font-semibold uppercase">{currentPlan}</span>
              </p>
            )}
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#388BFD]/15 text-[#388BFD] border border-[#388BFD]/40'
                  : 'text-[#484F58] border border-transparent hover:text-[#8B949E]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/40'
                  : 'text-[#484F58] border border-transparent hover:text-[#8B949E]'
              }`}
            >
              Annual
              <span className="ml-1.5 text-[9px] text-[#3FB950]">Save 20%</span>
            </button>
          </div>

          {error && (
            <div className="max-w-md mx-auto mb-6 text-[12px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* ── Plan cards — 5 tiers ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {PLANS.map(plan => {
              const isCurrent = !isLoading && currentPlan.toLowerCase() === plan.id;
              const isPaid = plan.id !== 'free' && plan.id !== 'institutional';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col bg-[#161B22] border rounded-lg overflow-hidden transition-all ${plan.border} ${
                    plan.highlight ? 'ring-1 ring-[#388BFD]/40' : ''
                  }`}
                >
                  {plan.accentLine && (
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${plan.accentLine} to-transparent`} />
                  )}

                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-[#21262D]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${plan.badgeBg} ${plan.badgeText}`}>
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 rounded px-1.5 py-0.5">
                          Current
                        </span>
                      )}
                      {plan.badge && !isCurrent && (
                        <span className={`text-[9px] font-mono uppercase tracking-widest ${plan.badgeText} ${plan.badgeBg} border ${plan.border} rounded px-1.5 py-0.5`}>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#484F58] mb-2">{plan.tagline}</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-[26px] font-mono font-semibold ${plan.color}`}>{displayPrice(plan)}</span>
                      <span className="text-[11px] font-mono text-[#484F58] mb-1">{plan.period}</span>
                    </div>
                    {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                      <p className="text-[10px] font-mono text-[#3FB950] mt-1">
                        Save ${annualSavings(plan)}/year
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex-1 px-4 py-3 space-y-1.5">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckIcon className="h-3 w-3 text-[#3FB950] mt-0.5 flex-shrink-0" />
                        <span className="text-[11px] font-mono text-[#C9D1D9]">{f}</span>
                      </div>
                    ))}
                    {plan.locked.map(f => (
                      <div key={f} className="flex items-start gap-2 opacity-35">
                        <LockIcon className="h-3 w-3 text-[#484F58] mt-0.5 flex-shrink-0" />
                        <span className="text-[11px] font-mono text-[#484F58]">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-4 pb-4 space-y-1.5">
                    <button
                      onClick={() => handleCta(plan.id as PlanId)}
                      disabled={isCurrent || loadingPlan === plan.id}
                      className={`w-full rounded px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${plan.ctaClass}`}
                    >
                      {isCurrent
                        ? 'Current plan'
                        : loadingPlan === plan.id
                          ? 'Redirecting…'
                          : plan.cta}
                    </button>
                    {isPaid && !isCurrent && user && (
                      <button
                        onClick={() => handlePayWithCard(plan.id as PlanId)}
                        disabled={loadingPlan === plan.id}
                        className="w-full rounded px-3 py-1 text-[10px] font-mono text-[#484F58] hover:text-[#8B949E] border border-[#21262D] hover:border-[#30363D] transition-colors disabled:opacity-50"
                      >
                        Pay with card
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Social proof strip */}
          <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-mono text-[#484F58]">
            <span>18 exchanges connected</span>
            <span className="text-[#21262D]">|</span>
            <span>128 pairs monitored</span>
            <span className="text-[#21262D]">|</span>
            <span>10,000+ gaps detected/hour</span>
            <span className="text-[#21262D]">|</span>
            <span className="text-[#3FB950]">98.7% Magnus AI win rate</span>
          </div>

          {/* Payment method note */}
          <p className="text-center text-[11px] font-mono text-[#484F58] mt-3">
            Pay with crypto (USDC/USDT) or card.{' '}
            {billingCycle === 'annual' ? 'Billed annually.' : 'Billed monthly.'}{' '}
            Cancel anytime.
          </p>

          {/* ── Feature comparison table — 5 columns ── */}
          <div className="mt-14">
            <h2 className="text-[14px] font-mono font-semibold uppercase tracking-widest text-[#E6EDF3] mb-6 text-center">
              Feature comparison
            </h2>
            <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-[#21262D]">
                      <th className="px-3 py-3 text-left text-[#484F58] font-normal uppercase tracking-wider">Feature</th>
                      <th className="px-3 py-3 text-center text-[#8B949E] font-normal uppercase tracking-wider">Free</th>
                      <th className="px-3 py-3 text-center text-[#388BFD] font-normal uppercase tracking-wider">Trader</th>
                      <th className="px-3 py-3 text-center text-[#D29922] font-normal uppercase tracking-wider">Pro</th>
                      <th className="px-3 py-3 text-center text-[#06B6D4] font-normal uppercase tracking-wider">Magnus</th>
                      <th className="px-3 py-3 text-center text-[#A371F7] font-normal uppercase tracking-wider">Inst.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={row.label} className={`border-b border-[#21262D]/50 ${i % 2 === 0 ? '' : 'bg-[#0D1117]/30'}`}>
                        <td className="px-3 py-2 text-[#8B949E]">{row.label}</td>
                        <td className={`px-3 py-2 text-center ${compCellColor(row.free)}`}>{row.free}</td>
                        <td className={`px-3 py-2 text-center ${compCellColor(row.trader)}`}>{row.trader}</td>
                        <td className={`px-3 py-2 text-center ${compCellColor(row.pro)}`}>{row.pro}</td>
                        <td className={`px-3 py-2 text-center ${compCellColor(row.magnus)}`}>{row.magnus}</td>
                        <td className={`px-3 py-2 text-center ${compCellColor(row.inst)}`}>{row.inst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── FAQ ── */}
          <div className="mt-14 max-w-2xl mx-auto">
            <h2 className="text-[14px] font-mono font-semibold uppercase tracking-widest text-[#E6EDF3] mb-6 text-center">
              Frequently asked
            </h2>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left text-[13px] font-mono text-[#C9D1D9] hover:text-[#E6EDF3] transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-[#484F58] flex-shrink-0 ml-3 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-[12px] font-mono text-[#8B949E] border-t border-[#21262D] pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] font-mono text-[#484F58] mt-10">
            Questions? Email{' '}
            <a href="mailto:hello@arbitrance.com" className="text-[#388BFD] hover:underline">
              hello@arbitrance.com
            </a>
          </p>
        </div>
      </main>

      {/* PaymentModal */}
      {cryptoModal && (
        <PaymentModal
          plan={cryptoModal}
          accessToken={accessToken}
          onClose={() => setCryptoModal(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
