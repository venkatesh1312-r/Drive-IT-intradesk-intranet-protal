const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
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
    if (res.status === 401 && !path.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // Auth & user
  register: (body: object) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: object) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/api/users/me'),
  getWallet: () => request('/api/users/wallet'),
  getLeaderboard: () => request('/api/users/leaderboard'),
  updateProfile: (body: { name?: string; designation?: string }) =>
    request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),

  // Nominations
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

  // Tickets
  createTicket: (body: object) => request('/api/tickets', { method: 'POST', body: JSON.stringify(body) }),
  getMyTickets: (status?: string) => {
    const q = new URLSearchParams({ scope: 'mine' });
    if (status) q.set('status', status);
    return request(`/api/tickets?${q}`);
  },
  // IT agent queue — all IT-department tickets (backend scopes by role)
  getDeptQueue: (status?: string) =>
    request(`/api/tickets${status ? `?status=${status}` : ''}`),
  getAllTickets: (params?: { status?: string; priority?: string; department?: string; isBlocked?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.department) q.set('department', params.department);
    if (params?.isBlocked !== undefined) q.set('isBlocked', String(params.isBlocked));
    return request(`/api/tickets${q.toString() ? `?${q}` : ''}`);
  },
  getTicket: (id: number) => request(`/api/tickets/${id}`),
  updateTicket: (id: number, body: object) =>
    request(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getTicketAnalytics: () => request('/api/tickets/analytics'),

  // Comments
  createComment: (ticketId: number, body: object) =>
    request(`/api/tickets/${ticketId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  getComments: (ticketId: number) => request(`/api/tickets/${ticketId}/comments`),
  editComment: (ticketId: number, commentId: number, body: object) =>
    request(`/api/tickets/${ticketId}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Users (host/assignee pickers)
  listUsers: () => request('/api/users/list'),
  searchUsers: (query: string) => request(`/api/users/search?query=${encodeURIComponent(query)}`),

  // Visitor management
  scheduleVisit: (body: object) => request('/api/visits', { method: 'POST', body: JSON.stringify(body) }),
  getMyVisits: () => request('/api/visits/mine'),
  scheduleMyVisit: (body: object) => request('/api/visits/mine', { method: 'POST', body: JSON.stringify(body) }),
  getVisits: (params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.date) q.set('date', params.date);
    return request(`/api/visits${q.toString() ? `?${q}` : ''}`);
  },
  getOnSiteVisits: () => request('/api/visits/on-site'),
  checkInVisit: (id: number, body: object) => request(`/api/visits/${id}/check-in`, { method: 'POST', body: JSON.stringify(body) }),
  checkOutVisit: (id: number) => request(`/api/visits/${id}/check-out`, { method: 'POST' }),
  cancelVisit: (id: number, body?: object) => request(`/api/visits/${id}/cancel`, { method: 'POST', body: JSON.stringify(body || {}) }),
  rescheduleVisit: (id: number, body: object) => request(`/api/visits/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  walkInVisit: (body: object) => request('/api/visits/walk-in', { method: 'POST', body: JSON.stringify(body) }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  getUnreadCount: () => request('/api/notifications/unread-count'),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),
  clearNotifications: () => request('/api/notifications/clear-all', { method: 'DELETE' }),
  markOneRead: (id: number) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
};
