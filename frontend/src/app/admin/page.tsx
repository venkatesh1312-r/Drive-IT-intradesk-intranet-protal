'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  ABOVE_AND_BEYOND: 'Above & Beyond', TEAM_PLAYER: 'Team Player',
  INNOVATION: 'Innovation', CLIENT_IMPACT: 'Client Impact', MENTORSHIP: 'Mentorship',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-green-50 text-green-700', DECLINED: 'bg-red-50 text-red-600',
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pointsInput, setPointsInput] = useState<Record<number, string>>({});
  const [consent, setConsent] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');
  const [msg, setMsg] = useState<Record<number, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'ADMIN') { router.push('/dashboard'); return; }
    setUser(u);
    loadData();
  }, []);

  async function loadData() {
    const [noms, s] = await Promise.all([api.getAllNominations(), api.getStats()]);
    setNominations(noms);
    setStats(s);
  }

  async function handleApprove(id: number) {
    const pts = parseInt(pointsInput[id]);
    if (!pts || pts < 1) return;
    try {
      await api.approveNomination(id, pts);
      setMsg({ ...msg, [id]: '✓ Approved' });
      loadData();
    } catch (e: any) { setMsg({ ...msg, [id]: e.message }); }
  }

  async function handleDecline(id: number) {
    try {
      await api.declineNomination(id);
      loadData();
    } catch {}
  }

  function logout() { localStorage.clear(); router.push('/'); }

  const filtered = nominations.filter(n => filter === 'ALL' || n.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div>
          <span className="font-semibold text-gray-900">DRIVEIT HR</span>
          <span className="text-xs text-gray-400 ml-2">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Logout</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[['Total', stats.total, 'text-gray-900'], ['Pending', stats.pending, 'text-amber-600'], ['Approved', stats.approved, 'text-green-600'], ['Declined', stats.declined, 'text-red-500']].map(([label, val, cls]) => (
              <div key={label as string} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className={`text-2xl font-semibold ${cls}`}>{val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          {(['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-xs rounded-md transition font-medium ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No nominations.</p>}
          {filtered.map(n => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400">#{n.id} · {n.projectName}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{n.nomineeName}</p>
                  <p className="text-xs text-gray-500">by {n.nominatedBy} · {CATEGORY_LABELS[n.category]}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Submitted by {n.submittedBy?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.points && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{n.points} pts</span>}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status]}`}>{n.status.toLowerCase()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 mb-3">{n.context}</p>
              {n.status === 'PENDING' && (
                <div className="border-t border-gray-100 pt-3 flex items-center gap-3 flex-wrap">
                  <input type="number" min="1" max="500" placeholder="pts"
                    value={pointsInput[n.id] || ''}
                    onChange={e => setPointsInput({ ...pointsInput, [n.id]: e.target.value })}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={consent[n.id] || false}
                      onChange={e => setConsent({ ...consent, [n.id]: e.target.checked })} />
                    consent confirmed
                  </label>
                  <button
                    disabled={!consent[n.id] || !parseInt(pointsInput[n.id])}
                    onClick={() => handleApprove(n.id)}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition">
                    Approve
                  </button>
                  <button onClick={() => handleDecline(n.id)}
                    className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition">
                    Decline
                  </button>
                  {msg[n.id] && <span className="text-xs text-green-600">{msg[n.id]}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
