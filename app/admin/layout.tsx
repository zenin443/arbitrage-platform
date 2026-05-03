'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck, Users, Activity, ScrollText, Palette,
  LayoutDashboard, ArrowLeft, Bot, BarChart2,
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/admin',            label: 'Overview',        icon: LayoutDashboard },
  { group: 'BOTS' },
  { href: '/admin/magnus',     label: 'Magnus Fleet',    icon: Bot },
  { group: 'DATA' },
  { href: '/admin/gaps',       label: 'Gap Analytics',   icon: BarChart2 },
  { group: 'USERS' },
  { href: '/admin/users',      label: 'Users',           icon: Users },
  { href: '/admin/audit',      label: 'Audit Log',       icon: ScrollText },
  { group: 'SYSTEM' },
  { href: '/admin/health',     label: 'System',          icon: Activity },
  { href: '/admin/whitelabel', label: 'White Label',     icon: Palette },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAdmin = user?.role === 'admin' ||
    process.env.NEXT_PUBLIC_DEV_AUDIT_MODE === 'true';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#388BFD]" />
          <span className="text-sm text-[#8B949E]">Loading admin panel…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldCheck className="h-12 w-12 text-[#F85149] mx-auto" />
          <h1 className="text-xl font-medium text-[#E6EDF3]">Admin Access Required</h1>
          <p className="text-sm text-[#8B949E]">You need admin privileges to access this panel.</p>
          <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 text-sm bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] rounded-md transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-[#161B22] border-r border-[#21262D] flex flex-col">
        <div className="px-4 py-4 border-b border-[#21262D]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#388BFD]" />
            <span className="text-sm font-medium text-[#E6EDF3]">Admin Panel</span>
          </div>
          <p className="text-[10px] text-[#484F58] mt-1 font-mono">
            {user?.email || 'dev@arbitrance.internal'}
          </p>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {ADMIN_NAV.map((item, idx) => {
            // Group separator
            if ('group' in item) {
              return (
                <div key={`group-${idx}`} className="px-3 pt-3 pb-1">
                  <span className="text-[9px] text-[#30363D] font-mono uppercase tracking-widest">{item.group}</span>
                </div>
              );
            }
            const active = pathname === item.href ||
              (item.href !== '/admin' && (pathname ?? '').startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-colors ${
                  active
                    ? 'bg-[#388BFD]/15 text-[#388BFD] font-medium'
                    : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-[#21262D]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Terminal
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
