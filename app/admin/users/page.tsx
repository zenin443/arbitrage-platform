'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, ChevronLeft, ChevronRight, Filter,
  Shield, Ban, CheckCircle, User, Download, RefreshCw,
} from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  plan_tier: string | null;
  sub_status: string | null;
  active_sessions: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  free:           { bg: '#21262D', text: '#8B949E' },
  trader:         { bg: '#3FB950/15', text: '#3FB950' },
  pro:            { bg: '#388BFD/15', text: '#388BFD' },
  institutional:  { bg: '#A371F7/15', text: '#A371F7' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPlan, setBulkPlan] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    if (search) params.set('search', search);
    if (planFilter) params.set('plan', planFilter);
    if (statusFilter) params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch { /* noop */ }
    setLoading(false);
  }, [search, planFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  // Export CSV
  const exportCsv = () => {
    const headers = ['ID', 'Email', 'Name', 'Role', 'Plan', 'Active', 'Sessions', 'Joined', 'Last Login'];
    const rows = users.map(u => [
      u.id,
      u.email,
      u.name ?? '',
      u.role,
      u.plan_tier ?? 'free',
      u.is_active ? 'yes' : 'no',
      u.active_sessions,
      new Date(u.created_at).toISOString(),
      u.last_login_at ? new Date(u.last_login_at).toISOString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk plan change
  const applyBulkPlan = async () => {
    if (!bulkPlan || selectedIds.size === 0) return;
    setBulkApplying(true);
    try {
      await Promise.all(
        [...selectedIds].map(id =>
          fetch(`/api/admin/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_tier: bulkPlan }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkPlan('');
      await fetchUsers(pagination.page);
    } catch { /* noop */ }
    setBulkApplying(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3]">User Management</h1>
          <p className="text-xs text-[#484F58] mt-0.5">{pagination.total} users total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchUsers(pagination.page)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#3FB950] transition-colors"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-[400px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#484F58]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none"
            />
          </div>
        </form>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-[#484F58]" />
          {['', 'free', 'trader', 'pro', 'institutional'].map(plan => (
            <button
              key={plan}
              onClick={() => setPlanFilter(plan)}
              className={`px-2 py-1 text-[10px] rounded font-mono transition-colors ${
                planFilter === plan
                  ? 'bg-[#388BFD]/15 text-[#388BFD]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {plan || 'ALL'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {['', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                statusFilter === s
                  ? 'bg-[#3FB950]/15 text-[#3FB950]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {s || 'ALL STATUS'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#388BFD]/10 border border-[#388BFD]/30 rounded-lg">
          <span className="text-xs text-[#388BFD] font-mono">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#8B949E]">Change plan:</span>
            <select
              value={bulkPlan}
              onChange={e => setBulkPlan(e.target.value)}
              className="text-[10px] bg-[#0D1117] border border-[#21262D] rounded px-2 py-1 text-[#E6EDF3] focus:outline-none"
            >
              <option value="">Select…</option>
              {['free', 'trader', 'pro', 'institutional'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              onClick={() => void applyBulkPlan()}
              disabled={!bulkPlan || bulkApplying}
              className="px-3 py-1 text-[10px] bg-[#388BFD]/15 text-[#388BFD] rounded hover:bg-[#388BFD]/25 transition-colors disabled:opacity-40"
            >
              {bulkApplying ? 'Applying…' : 'Apply'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[10px] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#21262D] text-[10px] text-[#484F58] uppercase tracking-wide">
              <th className="px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedIds.size === users.length}
                  onChange={toggleSelectAll}
                  className="accent-[#388BFD]"
                />
              </th>
              <th className="text-left px-4 py-2.5">User</th>
              <th className="text-left px-4 py-2.5">Role</th>
              <th className="text-left px-4 py-2.5">Plan</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Sessions</th>
              <th className="text-left px-4 py-2.5">Joined</th>
              <th className="text-left px-4 py-2.5">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262D]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-4 bg-[#21262D] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-[#484F58]">No users found</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className={`hover:bg-[#21262D]/50 transition-colors ${selectedIds.has(u.id) ? 'bg-[#388BFD]/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="accent-[#388BFD]"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="group">
                      <div className="text-xs text-[#E6EDF3] group-hover:text-[#388BFD] transition-colors">{u.email}</div>
                      {u.name && <div className="text-[10px] text-[#484F58]">{u.name}</div>}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#A371F7]">
                        <Shield className="h-3 w-3" /> ADMIN
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
                        <User className="h-3 w-3" /> USER
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <PlanBadge plan={u.plan_tier || 'free'} />
                  </td>
                  <td className="px-4 py-2.5">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#3FB950]">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#F85149]">
                        <Ban className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#8B949E] font-mono">{u.active_sessions}</td>
                  <td className="px-4 py-2.5 text-[10px] text-[#484F58] font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-[10px] text-[#484F58] font-mono">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#484F58]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2 py-1 text-xs rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2 py-1 text-xs rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const style = PLAN_BADGE[plan] || PLAN_BADGE.free;
  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded capitalize"
      style={{ backgroundColor: `${style.text}22`, color: style.text }}
    >
      {plan}
    </span>
  );
}
