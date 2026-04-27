'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function NavAuthButton() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px] whitespace-nowrap"
      >
        Sign in
      </Link>
    );
  }

  const initial = (user.name || user.email || user.walletAddress || '?').charAt(0).toUpperCase();
  const titleText = user.email ?? user.walletAddress ?? undefined;

  return (
    <Link
      href="/account"
      title={titleText}
      className="w-7 h-7 rounded-full bg-[#21262D] text-[#C9D1D9] flex items-center justify-center text-xs font-mono hover:bg-[#30363D] transition-colors flex-shrink-0"
    >
      {initial}
    </Link>
  );
}
