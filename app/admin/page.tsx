'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, Shield, Activity,
  TrendingUp, UserPlus, Clock, ExternalLink,
} from 'lucide-react';

interface StatsData {
  totals: {
    total_users: string;
    active_users: string;
    admin_count: string;
    new_this_week: string;
    new_today: string;
  };
  planDistribution: Array<{ plan: string; count: string }>;
  recentSignups: Array<{
    id: string; email: string; name: string;
    role: string; created_at: string;
  }>;
  activeSessions: number;
}

interface HealthData {
  status: string;
  uptime: number;
  exchanges: number;
  symbols: number;
  gaps: number;
  activeConnections: number;
  memoryMB?: number;
}

const PLAN_COLORS: Record<string, string> = {
  free: '#8B949E',
  trader: '#3FB950',
  pro: '#388BFD',
  institutional: '#A371F7',
};

export default function AdminOverview() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/health'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-[#21262D] rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[#161B22] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const t = stats?.totals;

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3]">Admin Overview</h1>
          <p className="text-xs text-[#484F58] mt-0.5">Platform health and user management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono ${
            health?.status === 'ok'
              ? 'bg-[#3FB950]/10 text-[#3FB950] border border-[#3FB950]/30'
              : 'bg-[#F85149]/10 text-[#F85149] border border-[#F85149]/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${health?.status === 'ok' ? 'bg-[#3FB950] animate-pulse' : 'bg-[#F85149]'}`} />
            {health?.status === 'ok' ? 'ALL SYSTEMS ONLINE' : 'BACKEND OFFLINE'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} color="#388BFD" label="Total Users"
          value={t?.total_users || '0'}
          sub={`${t?.active_users || 0} active`}
        />
        <StatCard
          icon={UserPlus} color="#3FB950" label="New This Week"
          value={t?.new_this_week || '0'}
          sub={`${t?.new_today || 0} today`}
        />
        <StatCard
          icon={Activity} color="#A371F7" label="Active Sessions"
          value={String(stats?.activeSessions || 0)}
          sub={`${health?.activeConnections || 0} WS connections`}
        />
        <StatCard
          icon={Shield} color="#D29922" label="Admins"
          value={t?.admin_count || '0'}
          sub="admin accounts"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#388BFD]" />
              Plan Distribution
            </h2>
            <Link href="/admin/users" className="text-[10px] text-[#388BFD] hover:underline flex items-center gap-1">
              Manage <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.planDistribution.map(p => {
              const total = parseInt(t?.total_users || '1', 10) || 1;
              const count = parseInt(p.count, 10);
              const pct = Math.round((count / total) * 100);
              const color = PLAN_COLORS[p.plan] || '#8B949E';
              return (
                <div key={p.plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#E6EDF3] capitalize">{p.plan}</span>
                    <span className="text-xs text-[#8B949E] font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats?.planDistribution || stats.planDistribution.length === 0) && (
              <p className="text-xs text-[#484F58] text-center py-4">No subscription data yet</p>
            )}
          </div>
        </div>

        {/* Backend Health */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
          <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-[#3FB950]" />
            Backend Health
          </h2>
          {health ? (
            <div className="grid grid-cols-2 gap-3">
              <HealthItem label="Exchanges" value={String(health.exchanges)} />
              <HealthItem label="Symbols" value={String(health.symbols)} />
              <HealthItem label="Live Gaps" value={String(health.gaps)} />
              <HealthItem label="WS Clients" value={String(health.activeConnections)} />
              <HealthItem label="Uptime" value={`${Math.round((health.uptime || 0) / 60)}m`} />
              <HealthItem label="Memory" value={`${health.memoryMB ?? '?'} MB`} />
            </div>
          ) : (
            <p className="text-xs text-[#F85149] text-center py-4">Backend unreachable</p>
          )}
        </div>
      </div>

      {/* Recent Signups */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#3FB950]" />
            Recent Signups
          </h2>
          <Link href="/admin/users" className="text-[10px] text-[#388BFD] hover:underline">
            View All
          </Link>
        </div>
        <div className="space-y-2">
          {stats?.recentSignups.map(u => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#21262D] transition-colors"
            >
              <div>
                <span className="text-xs text-[#E6EDF3]">{u.email}</span>
                {u.name && <span className="text-[10px] text-[#484F58] ml-2">{u.name}</span>}
              </div>
              <div className="flex items-center gap-2">
                {u.role === 'admin' && (
                  <span className="text-[9px] bg-[#A371F7]/15 text-[#A371F7] px-1.5 py-0.5 rounded font-mono">ADMIN</span>
                )}
                <span className="text-[10px] text-[#484F58] font-mono flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
          {(!stats?.recentSignups || stats.recentSignups.length === 0) && (
            <p className="text-xs text-[#484F58] text-center py-4">No users yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType; color: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[11px] text-[#8B949E]">{label}</span>
      </div>
      <div className="text-2xl font-mono font-medium text-[#E6EDF3]">{value}</div>
      <div className="text-[10px] text-[#484F58] mt-1">{sub}</div>
    </div>
  );
}

function HealthItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0D1117] rounded-md px-3 py-2">
      <div className="text-[10px] text-[#484F58] mb-0.5">{label}</div>
      <div className="text-sm font-mono text-[#E6EDF3]">{value}</div>
    </div>
  );
}
