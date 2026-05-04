'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, ShieldCheck, BarChart3, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { signup, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/intelligence');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup(email, password, name);
      router.push('/intelligence');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        .pulse-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
        .glow-amber { box-shadow: 0 0 18px rgba(56,139,253,0.25); }
        .glow-purple { box-shadow: 0 0 18px rgba(56,139,253,0.25); }
        .input-focus:focus { border-color: #388BFD !important; box-shadow: 0 0 0 2px rgba(56,139,253,0.15); outline: none; }
      ` }} />

      <div className="min-h-screen flex" style={{ background: '#0D1117', fontFamily: "'IBM Plex Sans', sans-serif", color: '#E6EDF3' }}>

        {/* LEFT PANEL — Feature Showcase (60%) */}
        <div
          className="hidden lg:flex lg:w-[60%] flex-col items-center justify-center p-10 relative overflow-hidden"
          style={{ background: '#0D1117', borderRight: '1px solid #21262D' }}
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`h${i}`} style={{ position: 'absolute', top: `${i * 5}%`, left: 0, right: 0, height: '1px', background: '#388BFD' }} />
            ))}
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`v${i}`} style={{ position: 'absolute', left: `${i * 5}%`, top: 0, bottom: 0, width: '1px', background: '#388BFD' }} />
            ))}
          </div>

          {/* Centered content block */}
          <div className="relative z-10 max-w-lg w-full">
            {/* Logo + Brand */}
            <div className="flex items-center gap-3 mb-14">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="#388BFD" stroke="#388BFD" strokeWidth="0.5" />
              </svg>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="#388BFD" stroke="#388BFD" strokeWidth="0.5" />
              </svg>
              <span className="text-lg font-bold tracking-wider" style={{ color: '#388BFD', fontFamily: "'IBM Plex Mono', monospace" }}>
                Arbitrance Terminal
              </span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-10" style={{
              fontFamily: "'IBM Plex Mono', monospace",
              background: 'linear-gradient(90deg, #388BFD, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Spot Arbitrage<br />Opportunities<br />Before the Market Closes
            </h1>

            {/* Live Stats Ticker */}
            <div className="flex flex-wrap gap-3 mb-10">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: '#161B22', border: '1px solid #21262D' }}>
                <span className="pulse-dot w-2 h-2 rounded-full inline-block" style={{ background: '#3FB950' }} />
                <span className="text-sm font-medium" style={{ color: '#3FB950' }}>14 Live Signals</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: '#161B22', border: '1px solid #21262D' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#388BFD" strokeWidth="2.5">
                  <path d="M7 17l5-5 5 5M7 11l5-5 5 5" />
                </svg>
                <span className="text-sm font-medium" style={{ color: '#388BFD' }}>Avg Spread 0.34%</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: '#161B22', border: '1px solid #21262D' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" stroke="#BC8CFF" fill="none" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span className="text-sm font-medium" style={{ color: '#BC8CFF' }}>Exchanges: 12</span>
              </div>
            </div>

            {/* Feature List */}
            <ul className="space-y-4 mb-10">
              {[
                { icon: <Zap className="w-5 h-5" />, text: 'Real-time CEX-CEX arbitrage signals', color: '#388BFD' },
                { icon: <ShieldCheck className="w-5 h-5" />, text: 'Quality-gated: only profitable opportunities', color: '#3FB950' },
                { icon: <BarChart3 className="w-5 h-5" />, text: 'Multi-exchange depth analysis', color: '#388BFD' },
                { icon: <Clock className="w-5 h-5" />, text: 'Sub-30s signal freshness guarantee', color: '#BC8CFF' },
              ].map(({ icon, text, color }, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span style={{ color }}>{icon}</span>
                  <span className="text-sm" style={{ color: '#8B949E' }}>{text}</span>
                </li>
              ))}
            </ul>

            {/* Social Proof */}
            <div className="flex items-center gap-3 pt-6" style={{ borderTop: '1px solid #21262D' }}>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" className="w-4 h-4" fill="#D29922">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm" style={{ color: '#8B949E' }}>Trusted by <strong style={{ color: '#E6EDF3' }}>2,400+</strong> traders</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Auth Form (40%) */}
        <div className="w-full lg:w-[40%] flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="#388BFD" />
              </svg>
              <span className="text-base font-bold tracking-wider" style={{ color: '#388BFD', fontFamily: "'IBM Plex Mono', monospace" }}>
                Arbitrance Terminal
              </span>
            </div>

            {/* Card */}
            <div className="rounded-2xl p-8" style={{ background: '#161B22', border: '1px solid #21262D' }}>

              <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#E6EDF3', fontFamily: "'IBM Plex Mono', monospace" }}>
                Create Account
              </h2>

              {/* Social OAuth buttons */}
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => alert('OAuth coming soon')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium hover:opacity-90"
                  style={{ background: '#161B22', color: '#E6EDF3', border: '1px solid #21262D' }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={() => alert('OAuth coming soon')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium hover:opacity-90"
                  style={{ background: '#24292F', color: '#E6EDF3', border: '1px solid #21262D' }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Continue with GitHub
                </button>

                <button
                  type="button"
                  onClick={() => alert('OAuth coming soon')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium hover:opacity-90"
                  style={{ background: '#229ED9', color: '#FFFFFF', border: '1px solid #21262D' }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  Continue with Telegram
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: '#21262D' }} />
                <span className="text-xs" style={{ color: '#8B949E' }}>or continue with email</span>
                <div className="flex-1 h-px" style={{ background: '#21262D' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: '#8B949E' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input-focus w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200"
                    style={{ background: '#0D1117', border: '1px solid #21262D', color: '#E6EDF3' }}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: '#8B949E' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-focus w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200"
                    style={{ background: '#0D1117', border: '1px solid #21262D', color: '#E6EDF3' }}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: '#8B949E' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-focus w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200"
                    style={{ background: '#0D1117', border: '1px solid #21262D', color: '#E6EDF3' }}
                    placeholder="••••••••"
                  />
                  <p className="text-xs mt-1.5" style={{ color: '#8B949E' }}>Minimum 8 characters</p>
                </div>

                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ color: '#FCA5A5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#388BFD', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace" }}
                  onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#2F7DD6'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#388BFD'; }}
                >
                  {submitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-xs mt-5" style={{ color: '#8B949E' }}>
                Start free. Upgrade anytime.
              </p>
            </div>

            {/* Switch link */}
            <p className="text-center mt-5 text-sm" style={{ color: '#8B949E' }}>
              Already have an account?{' '}
              <Link href="/login" className="transition-all duration-200 cursor-pointer font-medium" style={{ color: '#388BFD' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#60A5FA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#388BFD')}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
