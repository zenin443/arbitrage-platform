'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ZapIcon, SettingsIcon, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NavAuthButton from '@/components/NavAuthButton';
import dynamic from 'next/dynamic';
import { CHAINS } from '@/lib/payments/config';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

interface Payment {
  id: string;
  plan_tier: string;
  amount: string;
  currency: string;
  chain: string;
  payment_method: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

async function openBillingPortal(accessToken: string | null): Promise<string | null> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const data = await res.json() as { url?: string; error?: string };
  return data.url ?? null;
}

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:          { label: 'FREE',          color: 'text-[#8B949E]', bg: 'bg-[#21262D]',         border: 'border-[#30363D]'       },
  trader:        { label: 'TRADER',        color: 'text-[#388BFD]', bg: 'bg-[#388BFD]/15',      border: 'border-[#388BFD]/40'    },
  pro:           { label: 'PRO',           color: 'text-[#D29922]', bg: 'bg-[#D29922]/15',      border: 'border-[#D29922]/40'    },
  institutional: { label: 'INSTITUTIONAL', color: 'text-[#A371F7]', bg: 'bg-[#A371F7]/15',      border: 'border-[#A371F7]/40'    },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:    { label: 'PENDING',    color: 'text-[#D29922]' },
  confirming: { label: 'CONFIRMING', color: 'text-[#388BFD]' },
  confirmed:  { label: 'CONFIRMED',  color: 'text-[#3FB950]' },
  failed:     { label: 'FAILED',     color: 'text-[#F85149]' },
  expired:    { label: 'EXPIRED',    color: 'text-[#484F58]' },
};

function planBadge(plan: string) {
  return PLAN_BADGE[plan?.toLowerCase()] ?? PLAN_BADGE.free;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function truncateTx(hash: string): string {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export default function AccountPage() {
  const { user, isLoading, logout, accessToken, checkAuth } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'trader' | 'pro' | 'institutional'>('pro');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && accessToken) {
      fetchPayments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken]);

  async function fetchPayments() {
    setPaymentsLoading(true);
    try {
      const res = await fetch('/api/payments/status', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.push('/login');
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const url = await openBillingPortal(accessToken);
      if (url) window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  }

  function openUpgradeModal(plan: 'trader' | 'pro' | 'institutional' = 'pro') {
    setPaymentPlan(plan);
    setShowPaymentModal(true);
  }

  async function handlePaymentSuccess() {
    setShowPaymentModal(false);
    // Refresh auth to pick up new plan tier
    if (checkAuth) await checkAuth();
    fetchPayments();
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#484F58] font-mono text-[13px]">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#388BFD] animate-pulse" />
          Loading…
        </div>
      </div>
    );
  }

  const badge = planBadge(user.plan);

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      {/* Nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-[13px] font-medium text-[#388BFD]">Arbitrage Terminal</span>
          <span className="text-[#484F58] select-none">|</span>
          <span className="text-[11px] text-[#484F58] font-mono">v0.7.4</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <div className="flex items-center gap-1 mr-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          <Link href="/intelligence" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            Intelligence
          </Link>
          <Link href="/magnus" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            Magnus
          </Link>
          <Link href="/dex-markets" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            DEX Markets
          </Link>
          <Link href="/funding-rates" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            Funding Rates
          </Link>
          <Link href="/dashboard" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            Dashboard
          </Link>
          <Link href="/settings" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="Settings">
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
          <NavAuthButton />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 space-y-4">
        <div>
          <h1 className="text-[14px] font-mono font-semibold uppercase tracking-widest text-[#E6EDF3]">
            Account
          </h1>
          <p className="text-[11px] font-mono text-[#484F58] mt-0.5">Manage your profile and subscription</p>
        </div>

        {/* Profile */}
        <section className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[#21262D]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#484F58]">Profile</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <Row label="Name" value={user.name} />
            {user.email && <Row label="Email" value={user.email} />}
            <Row label="Member since" value={formatDate(user.createdAt)} />
          </div>
        </section>

        {/* Subscription */}
        <section className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[#21262D]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#484F58]">Subscription</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-mono text-[#8B949E]">Current plan</span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${badge.color} ${badge.bg} ${badge.border}`}>
                {badge.label}
              </span>
            </div>
            {user.plan === 'free' ? (
              <button
                onClick={() => openUpgradeModal('pro')}
                className="text-[11px] font-mono text-[#388BFD] hover:text-[#58a6ff] border border-[#388BFD]/40 hover:border-[#388BFD] rounded px-3 py-1 transition-colors"
              >
                Upgrade →
              </button>
            ) : (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-[11px] font-mono text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] hover:border-[#484F58] rounded px-3 py-1 transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'Loading…' : 'Manage →'}
              </button>
            )}
          </div>
          {/* Crypto upgrade options for free users */}
          {user.plan === 'free' && (
            <div className="px-4 pb-3 flex gap-2">
              {(['trader', 'pro', 'institutional'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => openUpgradeModal(p)}
                  className="flex-1 text-[10px] font-mono uppercase tracking-wider py-1.5 rounded border border-[#21262D] text-[#484F58] hover:border-[#238636]/50 hover:text-[#3FB950] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Payment History */}
        <section className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[#21262D] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#484F58]">Payment History</span>
            {paymentsLoading && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#388BFD] animate-pulse" />
            )}
          </div>
          {payments.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] font-mono text-[#484F58]">No payment history</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#21262D]">
                    <th className="px-4 py-2 text-left text-[#484F58] font-normal uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-[#484F58] font-normal uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-2 text-left text-[#484F58] font-normal uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-[#484F58] font-normal uppercase tracking-wider">Chain</th>
                    <th className="px-4 py-2 text-left text-[#484F58] font-normal uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-[#484F58] font-normal uppercase tracking-wider">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const statusBadge = STATUS_BADGE[p.status] ?? { label: p.status.toUpperCase(), color: 'text-[#8B949E]' };
                    const chainCfg = CHAINS[p.chain];
                    const explorerBase = chainCfg?.explorerUrl || '';
                    return (
                      <tr key={p.id} className="border-b border-[#21262D]/50 hover:bg-[#1C2128]/50 transition-colors">
                        <td className="px-4 py-2 text-[#8B949E] whitespace-nowrap">{formatDate(p.created_at)}</td>
                        <td className="px-4 py-2 text-[#C9D1D9] uppercase">{p.plan_tier}</td>
                        <td className="px-4 py-2 text-[#C9D1D9]">${parseFloat(p.amount).toFixed(2)} {p.currency}</td>
                        <td className="px-4 py-2 text-[#8B949E]">{chainCfg?.name || p.chain}</td>
                        <td className={`px-4 py-2 font-semibold ${statusBadge.color}`}>{statusBadge.label}</td>
                        <td className="px-4 py-2">
                          {p.tx_hash && explorerBase ? (
                            <a
                              href={`${explorerBase}/tx/${p.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#388BFD] hover:underline"
                            >
                              {truncateTx(p.tx_hash)}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-[#484F58]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Active Sessions */}
        <section className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[#21262D]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#484F58]">Active Sessions</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-[12px] font-mono text-[#8B949E]">
              Revoke all refresh tokens and sign out everywhere.
            </p>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-[11px] font-mono text-[#D29922] hover:text-[#e3b341] border border-[#D29922]/40 hover:border-[#D29922] rounded px-3 py-1 transition-colors disabled:opacity-50 whitespace-nowrap ml-3"
            >
              {loggingOut ? 'Signing out…' : 'Logout all devices'}
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-[#161B22] border border-[#F85149]/30 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[#F85149]/20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F85149]/70">Danger Zone</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-[12px] font-mono text-[#8B949E]">
              Sign out of this session.
            </p>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-[11px] font-mono text-[#F85149] hover:text-red-400 border border-[#F85149]/40 hover:border-[#F85149] rounded px-3 py-1 transition-colors disabled:opacity-50 ml-3"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </section>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          plan={paymentPlan}
          accessToken={accessToken}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono text-[#8B949E]">{label}</span>
      <span className="text-[12px] font-mono text-[#C9D1D9]">{value}</span>
    </div>
  );
}
