'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity, Server, Database, Wifi, HardDrive, Clock,
  RefreshCw, AlertTriangle, CheckCircle,
} from 'lucide-react';

interface HealthData {
  status: string;
  uptime: number;
  exchanges: number;
  symbols: number;
  gaps: number;
  activeConnections: number;
  memoryMB?: number;
  tickRate?: number;
  lastTickAge?: number;
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) setHealth(await res.json());
      else setHealth(null);
    } catch {
      setHealth(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const iv = setInterval(fetchHealth, 10_000);
    return () => clearInterval(iv);
  }, [fetchHealth, autoRefresh]);

  const upMinutes = Math.round((health?.uptime || 0) / 60);
  const upHours = Math.floor(upMinutes / 60);
  const upDays = Math.floor(upHours / 24);

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3] flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#3FB950]" />
            System Health
          </h1>
          <p className="text-xs text-[#484F58] mt-0.5">Live backend infrastructure status</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] text-[#8B949E] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-[#388BFD]"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        health?.status === 'ok'
          ? 'bg-[#3FB950]/5 border-[#3FB950]/30'
          : 'bg-[#F85149]/5 border-[#F85149]/30'
      }`}>
        {health?.status === 'ok' ? (
          <CheckCircle className="h-5 w-5 text-[#3FB950]" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-[#F85149]" />
        )}
        <div>
          <div className="text-sm font-medium text-[#E6EDF3]">
            {health?.status === 'ok' ? 'All Systems Operational' : 'Backend Unreachable'}
          </div>
          <div className="text-[10px] text-[#8B949E]">
            {health ? `Uptime: ${upDays > 0 ? `${upDays}d ` : ''}${upHours % 24}h ${upMinutes % 60}m` : 'Cannot connect to price server'}
          </div>
        </div>
      </div>

      {health && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard icon={Server} color="#388BFD" label="Exchanges" value={String(health.exchanges)} desc="Active exchange adapters" />
          <MetricCard icon={Database} color="#A371F7" label="Symbols" value={String(health.symbols)} desc="Tracked trading pairs" />
          <MetricCard icon={Activity} color="#3FB950" label="Live Gaps" value={String(health.gaps)} desc="Active arbitrage opportunities" />
          <MetricCard icon={Wifi} color="#D29922" label="WS Clients" value={String(health.activeConnections)} desc="Connected WebSocket clients" />
          <MetricCard icon={HardDrive} color="#F85149" label="Memory" value={`${health.memoryMB ?? '?'} MB`} desc="Server memory usage" />
          <MetricCard icon={Clock} color="#8B949E" label="Uptime" value={`${upDays > 0 ? `${upDays}d ` : ''}${upHours % 24}h ${upMinutes % 60}m`} desc="Since last restart" />
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, color, label, value, desc }: {
  icon: React.ElementType; color: string; label: string; value: string; desc: string;
}) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[11px] text-[#8B949E]">{label}</span>
      </div>
      <div className="text-xl font-mono font-medium text-[#E6EDF3]">{value}</div>
      <div className="text-[10px] text-[#484F58] mt-1">{desc}</div>
    </div>
  );
}
