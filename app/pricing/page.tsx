'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ZapIcon, CheckIcon, LockIcon, SettingsIcon, ChevronDownIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NavAuthButton from '@/components/NavAuthButton';
import dynamic from 'next/dynamic';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

// ── Plan definitions ────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Free forever',
    color: 'text-[#8B949E]',
    border: 'border-[#21262D]',
    badgeBg: 'bg-[#21262D]',
    badgeText: 'text-[#8B949E]',
    cta: 'Get started free',
    ctaClass: 'bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3]',
    features: [
      'Delayed data (15s)',
      '5 coins monitored',
      'CEX arbitrage only',
      'Ads shown',
    ],
    locked: [
      'Real-time data',
      'All 90+ coins',
      'DEX + Spot-Futures gaps',
      'Alerts',
      'Magnus AI',
    ],
  },
  {
    id: 'trader',
    name: 'Trader',
    price: '$19.95',
    period: '/month',
    tagline: 'For active traders',
    highlight: false,
    mostPopular: true,
    color: 'text-[#388BFD]',
    border: 'border-[#388BFD]/50',
    badgeBg: 'bg-[#388BFD]/15',
    badgeText: 'text-[#388BFD]',
    accentLine: 'via-[#388BFD]',
    cta: 'Start trading',
    ctaClass: 'bg-[#388BFD] hover:bg-[#58a6ff] text-white',
    features: [
      'Real-time data (0ms delay)',
      'All 90+ coins monitored',
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
    price: '$49.95',
    period: '/month',
    tagline: 'For serious arbitrageurs',
    highlight: true,
    color: 'text-[#D29922]',
    border: 'border-[#D29922]/50',
    badgeBg: 'bg-[#D29922]/15',
    badgeText: 'text-[#D29922]',
    accentLine: 'via-[#D29922]',
    cta: 'Go Pro',
    ctaClass: 'bg-[#D29922] hover:bg-[#e3b341] text-[#0D1117]',
    features: [
      'Everything in Trader',
      'Magnus AI paper trader',
      'Push + SMS alerts',
      'REST API access',
      'Full data export',
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
    tagline: 'For funds & desks',
    color: 'text-[#A371F7]',
    border: 'border-[#A371F7]/50',
    badgeBg: 'bg-[#A371F7]/15',
    badgeText: 'text-[#A371F7]',
    accentLine: 'via-[#A371F7]',
    cta: 'Contact us',
    ctaClass: 'bg-[#A371F7] hover:bg-[#b992ff] text-white',
    features: [
      'Everything in Pro',
      'Custom API rate limits',
      'Webhook feeds',
      'White-label option',
      'Dedicated account manager',
      'Custom SLA',
    ],
    locked: [],
  },
] as const;

type PlanId = 'free' | 'trader' | 'pro' | 'institutional';

// ── Feature comparison matrix ────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { label: 'Data latency',       free: '15s delay',  trader: 'Real-time',  pro: 'Real-time',   inst: 'Real-time'   },
  { label: 'Coins monitored',    free: '5',          trader: '90+',        pro: '90+',          inst: '90+' },
  { label: 'CEX arbitrage',      free: '✓',          trader: '✓',          pro: '✓',            inst: '✓' },
  { label: 'DEX / Cross-chain',  free: '—',          trader: '✓',          pro: '✓',            inst: '✓' },
  { label: 'Spot-Futures arb',   free: '—',          trader: '✓',          pro: '✓',            inst: '✓' },
  { label: 'Ads',                free: 'Shown',      trader: 'None',       pro: 'None',         inst: 'None' },
  { label: 'Basic alerts',       free: '—',          trader: '✓',          pro: '✓',            inst: '✓' },
  { label: 'Push / SMS alerts',  free: '—',          trader: '—',          pro: '✓',            inst: '✓' },
  { label: 'Magnus AI',          free: '—',          trader: '—',          pro: '✓',            inst: '✓' },
  { label: 'REST API',           free: '—',          trader: '—',          pro: '✓',            inst: 'Custom limits' },
  { label: 'CSV export',         free: '—',          trader: '✓',          pro: '✓',            inst: '✓' },
  { label: 'Full data export',   free: '—',          trader: '—',          pro: '✓',            inst: '✓' },
  { label: 'Webhooks',           free: '—',          trader: '—',          pro: '—',            inst: '✓' },
  { label: 'White-label',        free: '—',          trader: '—',          pro: '—',            inst: '✓' },
  { label: 'Support',            free: 'Community',  trader: 'Standard',   pro: 'Priority',     inst: 'Dedicated' },
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
    a: "Magnus is an autonomous paper-trading bot that detects and executes arbitrage trades in simulation using the live data feed. Pro users get full access to the Magnus dashboard including live stats, trade history, and rebalancing analytics.",
  },
  {
    q: 'Do you offer a free trial?',
    a: 'The Free tier gives you permanent access to CEX arbitrage data (with a 15s delay) so you can evaluate the platform before upgrading. No credit card required.',
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

  const currentPlan = user?.plan ?? 'free';

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

    // Logged-in user — open PaymentModal for crypto payment
    setCryptoModal(planId as 'trader' | 'pro' | 'institutional');
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
        body: JSON.stringify({ plan: planId }),
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

      <main className="flex-1 px-4 py-12">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-10">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#484F58] mb-2">Pricing</p>
            <h1 className="text-[24px] font-mono font-semibold text-[#E6EDF3] tracking-tight uppercase">
              Choose your plan
            </h1>
            <p className="text-[13px] font-mono text-[#8B949E] mt-2">
              Start free. Upgrade when you&apos;re ready.
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

          {/* ── Plan cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const isCurrent = !isLoading && currentPlan.toLowerCase() === plan.id;
              const isHighlight = 'highlight' in plan && plan.highlight;
              const isMostPopular = 'mostPopular' in plan && plan.mostPopular;
              const isPaid = plan.id !== 'free' && plan.id !== 'institutional';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col bg-[#161B22] border rounded-lg overflow-hidden transition-all ${plan.border} ${isHighlight ? 'ring-1 ring-[#D29922]/30 shadow-lg shadow-[#D29922]/5' : ''} ${isMostPopular ? 'ring-1 ring-[#388BFD]/30' : ''}`}
                >
                  {/* Top accent line */}
                  {'accentLine' in plan && (
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${plan.accentLine} to-transparent`} />
                  )}

                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-[#21262D]">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${plan.badgeBg} ${plan.badgeText}`}>
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 rounded px-1.5 py-0.5">
                          Current
                        </span>
                      )}
                      {isHighlight && !isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/30 rounded px-1.5 py-0.5">
                          Most Popular
                        </span>
                      )}
                      {isMostPopular && !isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#388BFD] bg-[#388BFD]/10 border border-[#388BFD]/30 rounded px-1.5 py-0.5">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#484F58] mb-2">{plan.tagline}</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-[28px] font-mono font-semibold ${plan.color}`}>{plan.price}</span>
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
                    {'locked' in plan && plan.locked.map((f: string) => (
                      <div key={f} className="flex items-start gap-2 opacity-35">
                        <LockIcon className="h-3.5 w-3.5 text-[#484F58] mt-0.5 flex-shrink-0" />
                        <span className="text-[12px] font-mono text-[#484F58]">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-5 space-y-1.5">
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
                    {/* Card payment option for paid plans */}
                    {isPaid && !isCurrent && user && (
                      <button
                        onClick={() => handlePayWithCard(plan.id as PlanId)}
                        disabled={loadingPlan === plan.id}
                        className="w-full rounded px-4 py-1.5 text-[10px] font-mono text-[#484F58] hover:text-[#8B949E] border border-[#21262D] hover:border-[#30363D] transition-colors disabled:opacity-50"
                      >
                        Pay with card →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment method note */}
          <p className="text-center text-[11px] font-mono text-[#484F58] mt-4">
            Pay with crypto (USDC/USDT) or card. All plans billed monthly. Cancel anytime.
          </p>

          {/* ── Feature comparison table ── */}
          <div className="mt-14">
            <h2 className="text-[14px] font-mono font-semibold uppercase tracking-widest text-[#E6EDF3] mb-6 text-center">
              Feature comparison
            </h2>
            <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] font-mono">
                  <thead>
                    <tr className="border-b border-[#21262D]">
                      <th className="px-4 py-3 text-left text-[#484F58] font-normal uppercase tracking-wider w-1/3">Feature</th>
                      <th className="px-4 py-3 text-center text-[#8B949E] font-normal uppercase tracking-wider">Free</th>
                      <th className="px-4 py-3 text-center text-[#388BFD] font-normal uppercase tracking-wider">Trader</th>
                      <th className="px-4 py-3 text-center text-[#D29922] font-normal uppercase tracking-wider">Pro</th>
                      <th className="px-4 py-3 text-center text-[#A371F7] font-normal uppercase tracking-wider">Inst.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={row.label} className={`border-b border-[#21262D]/50 ${i % 2 === 0 ? '' : 'bg-[#0D1117]/30'}`}>
                        <td className="px-4 py-2.5 text-[#8B949E]">{row.label}</td>
                        <td className="px-4 py-2.5 text-center text-[#484F58]">{row.free}</td>
                        <td className={`px-4 py-2.5 text-center ${row.trader === '✓' ? 'text-[#3FB950]' : row.trader === '—' ? 'text-[#21262D]' : 'text-[#388BFD]'}`}>{row.trader}</td>
                        <td className={`px-4 py-2.5 text-center ${row.pro === '✓' ? 'text-[#3FB950]' : row.pro === '—' ? 'text-[#21262D]' : 'text-[#D29922]'}`}>{row.pro}</td>
                        <td className={`px-4 py-2.5 text-center ${row.inst === '✓' ? 'text-[#3FB950]' : row.inst === '—' ? 'text-[#21262D]' : 'text-[#A371F7]'}`}>{row.inst}</td>
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

          {/* Footer note */}
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
