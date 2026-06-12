const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  register: (body: object) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: object) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/api/users/me'),
  getWallet: () => request('/api/users/wallet'),
  submitNomination: (body: object) => request('/api/nominations', { method: 'POST', body: JSON.stringify(body) }),
  getMyNominations: () => request('/api/nominations/mine'),
  getReceivedNominations: () => request('/api/nominations/received'),
  getAllNominations: () => request('/api/nominations'),
  getStats: () => request('/api/nominations/stats'),
  approveNomination: (id: number, points: number) =>
    request(`/api/nominations/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ points }) }),
  declineNomination: (id: number) =>
    request(`/api/nominations/${id}/decline`, { method: 'PATCH' }),
  escalateNomination: (id: number) =>
    request(`/api/nominations/${id}/escalate`, { method: 'PATCH' }),
};
