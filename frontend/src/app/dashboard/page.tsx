'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const CATEGORIES = ['ABOVE_AND_BEYOND', 'TEAM_PLAYER', 'INNOVATION', 'CLIENT_IMPACT', 'MENTORSHIP'];
const CATEGORY_LABELS: Record<string, string> = {
  ABOVE_AND_BEYOND: 'Above & Beyond', TEAM_PLAYER: 'Team Player',
  INNOVATION: 'Innovation', CLIENT_IMPACT: 'Client Impact', MENTORSHIP: 'Mentorship',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-green-50 text-green-700', DECLINED: 'bg-red-50 text-red-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [tab, setTab] = useState<'nominate' | 'mine' | 'wallet'>('nominate');
  const [form, setForm] = useState({ projectName: '', nomineeName: '', nominatedBy: '', category: '', context: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role === 'ADMIN') { router.push('/admin'); return; }
    setUser(u);
    loadData();
  }, []);

  async function loadData() {
    try {
      const [noms, w] = await Promise.all([api.getMyNominations(), api.getWallet()]);
      setNominations(noms);
      setWallet(w);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      await api.submitNomination(form);
      setMsg('✓ Nomination submitted!');
      setForm({ projectName: '', nomineeName: '', nominatedBy: '', category: '', context: '' });
      loadData();
    } catch (err: any) {
      setMsg(err.message);
    } finally { setLoading(false); }
  }

  function logout() { localStorage.clear(); router.push('/'); }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div>
          <span className="font-semibold text-gray-900">DRIVEIT HR</span>
          <span className="text-xs text-gray-400 ml-2">Employee</span>
        </div>
        <div className="flex items-center gap-4">
          {wallet && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{wallet.points} pts</span>}
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Logout</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          {(['nominate', 'mine', 'wallet'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm rounded-md transition font-medium ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {t === 'nominate' ? 'Nominate' : t === 'mine' ? 'My Nominations' : 'Points Wallet'}
            </button>
          ))}
        </div>

        {tab === 'nominate' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-medium text-gray-900 mb-4">Submit a nomination</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Project name</label>
                  <input required value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })}
                    placeholder="e.g. Portal Redesign"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nominee name</label>
                  <input required value={form.nomineeName} onChange={e => setForm({ ...form, nomineeName: e.target.value })}
                    placeholder="e.g. Riya Sharma"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nominated by</label>
                  <input required value={form.nominatedBy} onChange={e => setForm({ ...form, nominatedBy: e.target.value })}
                    placeholder="Team lead name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option value="">-- select --</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Context / appreciation note</label>
                <textarea required value={form.context} onChange={e => setForm({ ...form, context: e.target.value })}
                  rows={3} placeholder="Describe why this person deserves recognition..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
              {msg && <p className={`text-xs ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
              <div className="flex justify-end">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Submitting...' : 'Submit nomination'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'mine' && (
          <div className="space-y-3">
            {nominations.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No nominations yet.</p>}
            {nominations.map(n => (
              <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400">#{n.id} · {n.projectName}</p>
                    <p className="font-medium text-gray-900 mt-0.5">{n.nomineeName}</p>
                    <p className="text-xs text-gray-500">by {n.nominatedBy} · {CATEGORY_LABELS[n.category]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.points && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{n.points} pts</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status]}`}>{n.status.toLowerCase()}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{n.context}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'wallet' && wallet && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500">your balance</p>
              <p className="text-4xl font-semibold text-blue-600 mt-1">{wallet.points} pts</p>
              <p className="text-xs text-gray-400 mt-1">Points are awarded when your nominations get approved</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Redeem rewards</p>
              <div className="grid grid-cols-3 gap-2">
                {[{name:'Swiggy voucher',pts:50,icon:'🍔'},{name:'Amazon gift card',pts:100,icon:'📦'},{name:'Extra leave',pts:75,icon:'🌴'},{name:'Zomato voucher',pts:50,icon:'🍕'},{name:'Movie tickets',pts:60,icon:'🎬'},{name:'Flipkart voucher',pts:80,icon:'🛒'}].map(r => (
                  <div key={r.name} className="border border-gray-100 rounded-lg p-3 text-center cursor-pointer hover:border-blue-200 transition">
                    <div className="text-xl mb-1">{r.icon}</div>
                    <p className="text-xs font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.pts} pts</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">Redemption store — Phase 2 (coming soon)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
