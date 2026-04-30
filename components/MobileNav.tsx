'use client';

import Link from 'next/link';
import { BarChart2, Zap, Bot, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/intelligence', label: 'Intel',     icon: Zap },
  { href: '/dashboard',    label: 'Dashboard',  icon: BarChart2 },
  { href: '/magnus',       label: 'Magnus',     icon: Bot },
  { href: '/funding-rates', label: 'Rates',     icon: TrendingUp },
  { href: '/settings',     label: 'Settings',   icon: Settings },
] as const;

interface MobileNavProps {
  activePage: string;
}

export default function MobileNav({ activePage }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#161B22] border-t border-[#21262D] safe-area-bottom">
      <div className="flex items-stretch justify-around h-14">
        {TABS.map(tab => {
          const active = activePage === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                active
                  ? 'text-[#388BFD]'
                  : 'text-[#484F58] active:text-[#8B949E]',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-mono leading-none">{tab.label}</span>
              {active && (
                <span className="absolute top-0 w-8 h-[2px] rounded-full bg-[#388BFD]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
