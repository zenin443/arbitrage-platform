'use client';

import { useEffect, useState, useCallback } from 'react';
import { ScrollText, RefreshCw, Clock, Globe, ArrowRight, Download, Search } from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string;
  email: string;
  method: string;
  path: string;
  status_code: number;
  request_body: Record<string, unknown> | null;
  ip: string;
  user_agent: string;
  created_at: string;
}

const METHOD_COLOR: Record<string, string> = {
  GET: '#388BFD',
  POST: '#3FB950',
  PATCH: '#D29922',
  PUT: '#D29922',
  DELETE: '#F85149',
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-log?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  // Client-side filter
  const visible = entries.filter(e => {
    if (methodFilter && e.method !== methodFilter) return false;
    if (searchEmail && !e.email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
    if (dateFrom && new Date(e.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // CSV export
  const exportCsv = () => {
    const headers = ['ID', 'Email', 'Method', 'Path', 'Status', 'IP', 'Timestamp'];
    const rows = visible.map(e => [
      e.id, e.email, e.method, e.path,
      String(e.status_code), e.ip,
      new Date(e.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3] flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[#388BFD]" />
            Audit Log
          </h1>
          <p className="text-xs text-[#484F58] mt-0.5">
            {visible.length} of {entries.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value, 10))}
            className="text-[10px] bg-[#0D1117] border border-[#21262D] rounded px-2 py-1 text-[#8B949E] focus:outline-none"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>
          <button
            onClick={fetchAudit}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#3FB950] transition-colors"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Email search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#484F58]" />
          <input
            type="text"
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            placeholder="Filter by email…"
            className="pl-7 pr-3 py-1.5 text-[10px] bg-[#0D1117] border border-[#21262D] rounded text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none w-[180px]"
          />
        </div>

        {/* Method filter */}
        <div className="flex items-center gap-1">
          {['', 'GET', 'POST', 'PATCH', 'DELETE'].map(m => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-2 py-1 text-[9px] font-mono rounded transition-colors ${
                methodFilter === m
                  ? 'bg-[#388BFD]/15 text-[#388BFD]'
                  : 'text-[#484F58] hover:text-[#8B949E]'
              }`}
            >
              {m || 'ALL'}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-[#484F58]">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-[10px] bg-[#0D1117] border border-[#21262D] rounded px-2 py-1 text-[#8B949E] focus:outline-none"
          />
          <span className="text-[10px] text-[#484F58]">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-[10px] bg-[#0D1117] border border-[#21262D] rounded px-2 py-1 text-[#8B949E] focus:outline-none"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-[10px] text-[#F85149] hover:text-[#F85149]/70"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
        <div className="divide-y divide-[#21262D]">
          {loading && entries.length === 0 ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 bg-[#21262D] rounded animate-pulse" />
              </div>
            ))
          ) : visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#484F58]">No matching entries</div>
          ) : (
            visible.map(entry => (
              <div key={entry.id}>
                <button
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#21262D]/50 transition-colors flex items-center gap-3"
                >
                  {/* Method badge */}
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded w-[48px] text-center shrink-0"
                    style={{
                      color: METHOD_COLOR[entry.method] || '#8B949E',
                      backgroundColor: `${METHOD_COLOR[entry.method] || '#8B949E'}22`,
                    }}
                  >
                    {entry.method}
                  </span>

                  {/* Status */}
                  <span className={`text-[10px] font-mono w-[32px] text-center shrink-0 ${
                    entry.status_code < 300 ? 'text-[#3FB950]' : entry.status_code < 400 ? 'text-[#D29922]' : 'text-[#F85149]'
                  }`}>
                    {entry.status_code}
                  </span>

                  {/* Path */}
                  <span className="text-xs text-[#E6EDF3] font-mono flex-1 truncate">{entry.path}</span>

                  {/* Actor */}
                  <span className="text-[10px] text-[#8B949E] max-w-[180px] truncate">{entry.email}</span>

                  {/* IP */}
                  <span className="text-[10px] text-[#484F58] font-mono flex items-center gap-1 w-[120px] shrink-0">
                    <Globe className="h-3 w-3" /> {entry.ip}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[10px] text-[#484F58] font-mono flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.created_at).toLocaleString()}
                  </span>

                  <ArrowRight className={`h-3 w-3 text-[#484F58] transition-transform ${expanded === entry.id ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded detail */}
                {expanded === entry.id && (
                  <div className="px-4 pb-3 ml-[60px]">
                    <div className="bg-[#0D1117] rounded-md p-3 space-y-2 text-[10px]">
                      <div className="flex gap-3">
                        <span className="text-[#484F58] w-[80px] shrink-0">User ID</span>
                        <span className="text-[#E6EDF3] font-mono">{entry.user_id}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-[#484F58] w-[80px] shrink-0">User Agent</span>
                        <span className="text-[#8B949E] font-mono break-all">{entry.user_agent || '—'}</span>
                      </div>
                      {entry.request_body && (
                        <div>
                          <span className="text-[#484F58]">Request Body</span>
                          <pre className="mt-1 text-[#E6EDF3] font-mono bg-[#161B22] rounded p-2 overflow-x-auto">
                            {JSON.stringify(entry.request_body, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
