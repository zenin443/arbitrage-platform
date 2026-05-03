'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Ban, CheckCircle, LogOut,
  CreditCard, Clock, Globe, Monitor, Save,
} from 'lucide-react';

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  plan_tier: string | null;
  sub_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  default_quote_currency: string | null;
  watchlist: string[] | null;
  alert_enabled: boolean | null;
  theme: string | null;
}

interface Session {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

const PLANS = ['free', 'trader', 'pro', 'institutional'] as const;
const STATUSES = ['active', 'past_due', 'canceled', 'trialing'] as const;

export default function AdminUserDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Editable state
  const [editPlan, setEditPlan] = useState('free');
  const [editSubStatus, setEditSubStatus] = useState('active');
  const [editRole, setEditRole] = useState('user');
  const [editName, setEditName] = useState('');

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSessions(data.sessions || []);
        setEditPlan(data.user.plan_tier || 'free');
        setEditSubStatus(data.user.sub_status || 'active');
        setEditRole(data.user.role || 'user');
        setEditName(data.user.name || '');
      }
    } catch { /* noop */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tier: editPlan, status: editSubStatus }),
      });
      if (res.ok) {
        flash('ok', 'Plan updated');
        fetchUser();
      } else {
        const err = await res.json();
        flash('err', err.error || 'Failed');
      }
    } catch { flash('err', 'Network error'); }
    setSaving(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, name: editName }),
      });
      if (res.ok) {
        flash('ok', 'Profile updated');
        fetchUser();
      } else {
        const err = await res.json();
        flash('err', err.error || 'Failed');
      }
    } catch { flash('err', 'Network error'); }
    setSaving(false);
  };

  const toggleActive = async () => {
    if (!user) return;
    const newState = !user.is_active;
    if (!newState && !confirm(`Deactivate ${user.email}? This will destroy all their sessions.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newState }),
      });
      if (res.ok) {
        flash('ok', newState ? 'User reactivated' : 'User deactivated');
        fetchUser();
      }
    } catch { flash('err', 'Network error'); }
    setSaving(false);
  };

  const forceLogout = async () => {
    if (!confirm(`Force logout all sessions for ${user?.email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/sessions`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        flash('ok', data.message);
        fetchUser();
      }
    } catch { flash('err', 'Network error'); }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[#21262D] rounded" />
          <div className="h-32 bg-[#161B22] rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#F85149]">User not found</p>
        <button onClick={() => router.push('/admin/users')} className="mt-4 text-xs text-[#388BFD] hover:underline">
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Flash message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-xs font-mono ${
          message.type === 'ok' ? 'bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40' : 'bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/40'
        }`}>
          {message.text}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/admin/users" className="text-[10px] text-[#484F58] hover:text-[#388BFD] flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Users
        </Link>
        <span className="text-[10px] text-[#21262D]">/</span>
        <span className="text-[10px] text-[#8B949E] font-mono">{user.email}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3]">{user.email}</h1>
          <div className="flex items-center gap-2 mt-1">
            {user.role === 'admin' && (
              <span className="text-[9px] bg-[#A371F7]/15 text-[#A371F7] px-1.5 py-0.5 rounded font-mono">ADMIN</span>
            )}
            {user.is_active ? (
              <span className="text-[9px] bg-[#3FB950]/15 text-[#3FB950] px-1.5 py-0.5 rounded">Active</span>
            ) : (
              <span className="text-[9px] bg-[#F85149]/15 text-[#F85149] px-1.5 py-0.5 rounded">Inactive</span>
            )}
            <span className="text-[9px] font-mono text-[#484F58]">ID: {user.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={forceLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded bg-[#21262D] text-[#D29922] hover:bg-[#D29922]/15 transition-colors"
          >
            <LogOut className="h-3 w-3" /> Force Logout
          </button>
          <button
            onClick={toggleActive}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded transition-colors ${
              user.is_active
                ? 'bg-[#21262D] text-[#F85149] hover:bg-[#F85149]/15'
                : 'bg-[#3FB950]/15 text-[#3FB950] hover:bg-[#3FB950]/25'
            }`}
          >
            {user.is_active ? <><Ban className="h-3 w-3" /> Deactivate</> : <><CheckCircle className="h-3 w-3" /> Reactivate</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Editor */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#388BFD]" /> Profile
          </h2>
          <div>
            <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] focus:border-[#388BFD] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Role</label>
            <select
              value={editRole}
              onChange={e => setEditRole(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] focus:border-[#388BFD] focus:outline-none"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-[#484F58]">Email Verified</span>
              <div className="text-[#E6EDF3] font-mono mt-0.5">{user.email_verified ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <span className="text-[#484F58]">Joined</span>
              <div className="text-[#E6EDF3] font-mono mt-0.5">{new Date(user.created_at).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[#484F58]">Last Login</span>
              <div className="text-[#E6EDF3] font-mono mt-0.5">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '—'}</div>
            </div>
            <div>
              <span className="text-[#484F58]">Theme</span>
              <div className="text-[#E6EDF3] font-mono mt-0.5">{user.theme || 'default'}</div>
            </div>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded bg-[#388BFD] text-white hover:bg-[#388BFD]/80 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" /> Save Profile
          </button>
        </div>

        {/* Plan Editor */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#3FB950]" /> Subscription
          </h2>
          <div>
            <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Plan Tier</label>
            <select
              value={editPlan}
              onChange={e => setEditPlan(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] focus:border-[#388BFD] focus:outline-none"
            >
              {PLANS.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Status</label>
            <select
              value={editSubStatus}
              onChange={e => setEditSubStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] focus:border-[#388BFD] focus:outline-none"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-[#484F58]">Stripe Customer</span>
              <div className="text-[#E6EDF3] font-mono mt-0.5 truncate">{user.stripe_customer_id || '—'}</div>
            </div>
            <div>
              <span className="text-[#484F58]">Period End</span>
              <div className="text-[#E6EDF3] font-mono mt-0.5">{user.current_period_end ? new Date(user.current_period_end).toLocaleDateString() : '—'}</div>
            </div>
          </div>
          <button
            onClick={savePlan}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded bg-[#3FB950] text-white hover:bg-[#3FB950]/80 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" /> Update Plan
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
        <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2 mb-3">
          <Monitor className="h-4 w-4 text-[#D29922]" /> Sessions ({sessions.length})
        </h2>
        <div className="space-y-1.5">
          {sessions.length === 0 ? (
            <p className="text-xs text-[#484F58] text-center py-3">No sessions</p>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-[#0D1117] rounded-md">
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-[#3FB950]' : 'bg-[#484F58]'}`} />
                  <div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <Globe className="h-3 w-3 text-[#484F58]" />
                      <span className="text-[#E6EDF3] font-mono">{s.ip || 'unknown'}</span>
                    </div>
                    <div className="text-[9px] text-[#484F58] mt-0.5 max-w-[300px] truncate">{s.user_agent || 'unknown agent'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#8B949E] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-[#484F58]">
                    Expires: {new Date(s.expires_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
