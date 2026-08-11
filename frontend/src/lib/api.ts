const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Sidecar AI chatbot service (Express + Ollama). Runs separately from the NestJS API.
export const CHATBOT_BASE = process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:4000';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function chatbotRequest(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${CHATBOT_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Chatbot request failed');
  return data;
}

// Multipart upload — deliberately does NOT set Content-Type so the browser
// can attach its own multipart boundary; forcing application/json here
// would break multer's parsing on the chatbot-service side.
async function chatbotUpload(path: string, formData: FormData) {
  const token = getToken();
  const res = await fetch(`${CHATBOT_BASE}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Upload failed');
  return data;
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
    if (!res.ok) {
      // class-validator returns message as an array
      const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(msg || 'Request failed');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // AI Chatbot (sidecar service)
  getChatSessions: () => chatbotRequest('/askbot/sessions'),
  getChatSession: (id: string) => chatbotRequest(`/askbot/sessions/${id}`),
  deleteChatSession: (id: string) => chatbotRequest(`/askbot/sessions/${id}`, { method: 'DELETE' }),
  uploadPolicyDocs: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('pdf', f));
    return chatbotUpload('/policy_upload', formData);
  },

  // Auth & user
  requestOtp: (email: string) => request('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) => request('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  // Sign up (3 steps)
  signupRequestOtp: (email: string) =>
    request('/api/auth/signup/request-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  signupVerifyOtp: (email: string, otp: string) =>
    request('/api/auth/signup/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  signupComplete: (email: string, name: string, password: string, confirmPassword: string) =>
    request('/api/auth/signup/complete', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, confirmPassword }),
    }),
  login: (email: string, password: string) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  setPassword: (email: string, token: string, password: string) =>
    request('/api/auth/set-password', { method: 'POST', body: JSON.stringify({ email, token, password }) }),
  getMe: () => request('/api/users/me'),
  getWallet: () => request('/api/users/wallet'),
  getLeaderboard: () => request('/api/users/leaderboard'),
  updateProfile: (body: { name?: string; designation?: string }) =>
    request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // Admin: user approval & role management
  getAllUsers: () => request('/api/users'),
  getPendingUsers: () => request('/api/users/pending'),
  approveUser: (id: number, role: string) =>
    request(`/api/users/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  rejectUser: (id: number) => request(`/api/users/${id}/reject`, { method: 'PATCH' }),
  changeUserRole: (id: number, role: string) =>
    request(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

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

  // Projects (Work Log)
  getMyProjects: () => request('/api/projects/mine'),
  getAllProjects: () => request('/api/projects'),
  createProject: (body: { name: string; description?: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: number, body: { name?: string; description?: string; isActive?: boolean }) =>
    request(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getProjectMembers: (id: number) => request(`/api/projects/${id}/members`),
  addProjectMember: (id: number, userId: number) =>
    request(`/api/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeProjectMember: (id: number, userId: number) =>
    request(`/api/projects/${id}/members/${userId}`, { method: 'DELETE' }),

  // Work Log
  createWorkLogEntry: (body: { projectId: number; contributionType: string; description: string; link?: string; tags?: string[] }) =>
    request('/api/work-log', { method: 'POST', body: JSON.stringify(body) }),
  getMyWorkLog: () => request('/api/work-log/mine'),
  updateWorkLogEntry: (id: number, body: object) =>
    request(`/api/work-log/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteWorkLogEntry: (id: number) => request(`/api/work-log/${id}`, { method: 'DELETE' }),
  getWorkLogOverview: () => request('/api/work-log/overview'),
  getWorkLogAggregate: (params?: { employeeId?: number; projectId?: number; contributionType?: string; dateFrom?: string; dateTo?: string }) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set('employeeId', String(params.employeeId));
    if (params?.projectId) q.set('projectId', String(params.projectId));
    if (params?.contributionType) q.set('contributionType', params.contributionType);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return request(`/api/work-log${q.toString() ? `?${q}` : ''}`);
  },
  addWorkLogComment: (id: number, message: string) =>
    request(`/api/work-log/${id}/comments`, { method: 'POST', body: JSON.stringify({ message }) }),
  exportWorkLogCsv: async (params?: { employeeId?: number; projectId?: number; contributionType?: string; dateFrom?: string; dateTo?: string }) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set('employeeId', String(params.employeeId));
    if (params?.projectId) q.set('projectId', String(params.projectId));
    if (params?.contributionType) q.set('contributionType', params.contributionType);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    const token = getToken();
    const res = await fetch(`${BASE}/api/work-log/export${q.toString() ? `?${q}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to export CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
