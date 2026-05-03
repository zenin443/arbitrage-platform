'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Palette, Plus, Globe, Mail, ExternalLink,
  CheckCircle, XCircle, Eye,
} from 'lucide-react';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  primary_color: string;
  logo_url: string | null;
  support_email: string | null;
  owner_user_id: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export default function AdminWhitelabelPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({
    slug: '',
    name: '',
    domain: '',
    primary_color: '#10b981',
    logo_url: '',
    support_email: '',
  });

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whitelabel');
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/whitelabel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ slug: '', name: '', domain: '', primary_color: '#10b981', logo_url: '', support_email: '' });
        fetchTenants();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create tenant');
      }
    } catch {
      setError('Network error');
    }
    setCreating(false);
  };

  const [preview, setPreview] = useState<Tenant | null>(null);

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3] flex items-center gap-2">
            <Palette className="h-5 w-5 text-[#A371F7]" />
            White Label Management
          </h1>
          <p className="text-xs text-[#484F58] mt-0.5">Create branded instances for institutional clients</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-[#388BFD] text-white hover:bg-[#388BFD]/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Tenant
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[#161B22] border border-[#21262D] rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-medium text-[#E6EDF3]">Create White Label Tenant</h2>
          {error && (
            <div className="text-xs text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 rounded px-3 py-2">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Slug (unique ID)</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="acme-capital"
                className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Display Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Capital Trading"
                className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Custom Domain (optional)</label>
              <input
                type="text"
                value={form.domain}
                onChange={e => setForm({ ...form, domain: e.target.value })}
                placeholder="trading.acmecapital.com"
                className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Support Email</label>
              <input
                type="email"
                value={form.support_email}
                onChange={e => setForm({ ...form, support_email: e.target.value })}
                placeholder="support@acmecapital.com"
                className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Brand Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => setForm({ ...form, primary_color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-[#21262D]"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={e => setForm({ ...form, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] font-mono focus:border-[#388BFD] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#484F58] uppercase tracking-wide">Logo URL (optional)</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={e => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
                className="w-full mt-1 px-3 py-2 text-xs bg-[#0D1117] border border-[#21262D] rounded-md text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#388BFD] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-xs rounded bg-[#388BFD] text-white hover:bg-[#388BFD]/80 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Tenant'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-xs rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tenants list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[#161B22] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-8 text-center">
          <Palette className="h-8 w-8 text-[#484F58] mx-auto mb-3" />
          <p className="text-sm text-[#8B949E]">No white label tenants yet</p>
          <p className="text-xs text-[#484F58] mt-1">
            {tenants.length === 0 && !showCreate
              ? 'Click "New Tenant" to create your first branded instance, or run migration 009 first.'
              : 'Create a tenant to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tenants.map(t => (
            <div key={t.id} className="bg-[#161B22] border border-[#21262D] rounded-lg p-4 hover:border-[#30363D] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: t.primary_color }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-[#E6EDF3] font-medium">{t.name}</div>
                    <div className="text-[10px] text-[#484F58] font-mono">/{t.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[9px] text-[#3FB950]">
                      <CheckCircle className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] text-[#F85149]">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {t.domain && (
                  <div className="flex items-center gap-1 text-[#8B949E]">
                    <Globe className="h-3 w-3" />
                    <span className="font-mono">{t.domain}</span>
                  </div>
                )}
                {t.support_email && (
                  <div className="flex items-center gap-1 text-[#8B949E]">
                    <Mail className="h-3 w-3" />
                    <span>{t.support_email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-[#484F58]">
                  <Palette className="h-3 w-3" />
                  <span className="font-mono">{t.primary_color}</span>
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: t.primary_color }} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#21262D] flex items-center gap-2">
                <button
                  onClick={() => setPreview(preview?.id === t.id ? null : t)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
                {t.domain && (
                  <a
                    href={`https://${t.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[#21262D] text-[#388BFD] hover:text-[#E6EDF3] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Panel */}
      {preview && (
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#21262D] flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#E6EDF3]">Brand Preview: {preview.name}</h2>
            <button onClick={() => setPreview(null)} className="text-xs text-[#8B949E] hover:text-[#E6EDF3]">Close</button>
          </div>
          {/* Simulated header bar with tenant branding */}
          <div
            className="px-6 py-3 flex items-center justify-between"
            style={{ backgroundColor: preview.primary_color + '15', borderBottom: `2px solid ${preview.primary_color}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: preview.primary_color }}
              >
                {preview.name.charAt(0)}
              </div>
              <span className="text-sm font-medium" style={{ color: preview.primary_color }}>
                {preview.name}
              </span>
              <span className="text-[10px] text-[#484F58]">|</span>
              <span className="text-[10px] text-[#484F58] font-mono">Arbitrage Terminal</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-[#3FB950] font-mono">LIVE</span>
              <span className="text-[#8B949E]">Intelligence</span>
              <span style={{ color: preview.primary_color }} className="font-medium">Dashboard</span>
              <span className="text-[#8B949E]">Magnus</span>
            </div>
          </div>
          {/* Simulated content */}
          <div className="p-6 grid grid-cols-3 gap-3">
            {['Active Gaps', 'Net Spread', 'Win Rate'].map(label => (
              <div key={label} className="bg-[#0D1117] rounded-md p-3 border border-[#21262D]">
                <div className="text-[10px] text-[#484F58]">{label}</div>
                <div className="text-lg font-mono mt-1" style={{ color: preview.primary_color }}>—</div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-4 text-[10px] text-[#484F58]">
            {preview.support_email && <>Support: {preview.support_email} | </>}
            {preview.domain && <>Domain: {preview.domain} | </>}
            Powered by Arbitrance
          </div>
        </div>
      )}
    </div>
  );
}
