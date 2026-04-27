'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ZapIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WalletLoginButton } from '@/components/WalletLoginButton';

export default function SignupPage() {
  const { signup, walletLogin, isAuthenticated, isLoading } = useAuth();
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
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ZapIcon className="h-5 w-5 text-[#388BFD]" />
          <span className="text-[15px] font-medium text-[#388BFD] font-mono tracking-wide">
            ⚡ Arbitrance Terminal
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-6">
          <h1 className="text-[13px] font-mono font-semibold uppercase tracking-widest text-[#E6EDF3] mb-5 text-center">
            Create your account
          </h1>

          <form onSubmit={handleSubmit} action="#" className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-[#8B949E] uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#161B22] border border-[#21262D] rounded px-3 py-2 text-[13px] font-mono text-[#C9D1D9] placeholder-[#484F58] focus:outline-none focus:border-[#388BFD] transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#8B949E] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#161B22] border border-[#21262D] rounded px-3 py-2 text-[13px] font-mono text-[#C9D1D9] placeholder-[#484F58] focus:outline-none focus:border-[#388BFD] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#8B949E] uppercase tracking-wider mb-1.5">
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
                className="w-full bg-[#161B22] border border-[#21262D] rounded px-3 py-2 text-[13px] font-mono text-[#C9D1D9] placeholder-[#484F58] focus:outline-none focus:border-[#388BFD] transition-colors"
                placeholder="••••••••"
              />
              <p className="text-[10px] font-mono text-[#484F58] mt-1">Minimum 8 characters</p>
            </div>

            {error && (
              <p className="text-[12px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-2 text-[12px] font-mono font-semibold uppercase tracking-wider transition-colors mt-2"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#21262D]" />
            <span className="text-[11px] font-mono text-[#484F58] uppercase">or</span>
            <div className="flex-1 h-px bg-[#21262D]" />
          </div>

          {/* Wallet Connect */}
          <WalletLoginButton
            onSuccess={(user, token) => {
              walletLogin(user, token);
              router.push('/intelligence');
            }}
          />

          <p className="text-center text-[11px] font-mono text-[#484F58] mt-4">
            Start free. Upgrade anytime.
          </p>
        </div>

        <p className="text-center text-[12px] font-mono text-[#8B949E] mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-[#388BFD] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
