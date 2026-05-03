'use client';

import Link from 'next/link';
import { ZapIcon, SettingsIcon, ShieldCheck } from 'lucide-react';
import NavAuthButton from '@/components/NavAuthButton';
import { useAuth } from '@/contexts/AuthContext';

const APP_VERSION = 'v0.8.0';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
] as const;

interface AppHeaderProps {
  activePage: string;
  connectionStatus?: 'connecting' | 'connected' | 'error';
  showDelayedBadge?: boolean;
  /** Optional extra element between LIVE dot and nav links (e.g. clock, bot count) */
  statusSlot?: React.ReactNode;
}

export default function AppHeader({
  activePage,
  connectionStatus,
  showDelayedBadge = false,
  statusSlot,
}: AppHeaderProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || process.env.NEXT_PUBLIC_DEV_AUDIT_MODE === 'true';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
      <div className="flex items-center gap-3">
        <ZapIcon className="h-4 w-4 text-[#388BFD]" />
        <span className="text-[14px] font-medium font-sans text-[#388BFD]">
          Arbitrage Terminal
        </span>
        <span className="text-[#484F58] select-none mx-1">|</span>
        <span className="text-[12px] text-[#484F58] font-mono">{APP_VERSION}</span>
      </div>
      <div className="flex items-center gap-1 text-xs overflow-x-auto">
        <div className="flex items-center gap-1 mr-2">
          <span className="animate-pulse bg-[#3FB950] rounded-full w-1.5 h-1.5" />
          <span className="text-[#3FB950] font-mono text-[11px]">LIVE</span>
        </div>
        {showDelayedBadge && (
          <span className="text-[10px] font-mono text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/30 rounded px-1.5 py-0.5 mr-1">
            DELAYED 15s
          </span>
        )}
        {connectionStatus === 'connecting' && (
          <span className="text-[#D29922] font-mono text-[11px] mr-1">Connecting…</span>
        )}
        {connectionStatus === 'error' && (
          <span className="text-[#F85149] font-mono text-[11px] mr-1">Backend unavailable</span>
        )}
        {statusSlot}
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
              activePage === link.href
                ? 'bg-[#388BFD]/15 text-[#388BFD] font-medium'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            {link.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
              activePage === '/admin'
                ? 'bg-[#A371F7]/15 text-[#A371F7] font-medium'
                : 'text-[#A371F7]/70 hover:text-[#A371F7]'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            Admin
          </Link>
        )}
        <Link href="/settings" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="Settings">
          <SettingsIcon className="h-3.5 w-3.5" />
        </Link>
        <NavAuthButton />
      </div>
    </header>
  );
}
