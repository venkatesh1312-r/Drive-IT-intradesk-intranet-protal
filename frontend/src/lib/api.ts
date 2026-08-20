// Empty or unset NEXT_PUBLIC_API_URL both mean "use relative paths" — i.e.
// same-origin requests (fetch('/api/...')). Next.js does NOT inline an env
// var into the client bundle when it's set to an empty string at build
// time, so `process.env.NEXT_PUBLIC_API_URL` stays undefined in the
// browser even though Docker Compose passed "". `||` treats both
// undefined and "" as "not set", so this covers both cases correctly.
const BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Sidecar AI chatbot service (Express). Runs separately from the NestJS API.
export const CHATBOT_BASE = process.env.NEXT_PUBLIC_CHATBOT_URL || '';

// ── No localStorage/sessionStorage anywhere in this app ──────────────────
// Auth is a JWT in an httpOnly cookie (set by the backend on login,
// cleared by /auth/logout). The browser attaches it automatically via
// `credentials: 'include'` — client-side JS never reads or stores a
// token itself, so there is nothing here to cache. Identity/role always
// comes fresh from GET /api/users/me, never from a locally-cached copy.

async function chatbotRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${CHATBOT_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  const res = await fetch(`${CHATBOT_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Upload failed');
  return data;
}

// Fetches a binary response (PDF) from the chatbot service and returns it
// as an object URL the browser can open — used for the "View" action on
// uploaded policy documents.
async function chatbotDownload(path: string) {
  const res = await fetch(`${CHATBOT_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    let message = 'Failed to load document';
    try { message = (await res.json()).error || message; } catch {}
    throw new Error(message);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function request(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include', // send/receive the httpOnly auth cookie
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (res.status === 401 && !path.includes('/auth/')) {
      // Cookie is invalid/expired/superseded — the backend has already
      // cleared it (or will on our explicit logout call below). Nothing
      // client-side to clean up since nothing was ever cached here.
      // Guard against redirecting to '/' when already there (the login
      // page itself calls getMe() to check for an existing session —
      // without this check, an unauthenticated visit would 401 and
      // reload '/' in a loop).
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
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
  // No fixed count here — the backend returns the whole most-recent upload
  // batch (5 files, 10 files, etc). `limit` is only a safety ceiling.
  getRecentPolicyDocs: (limit = 50) => chatbotRequest(`/policy_upload/recent?limit=${limit}`),
  getPolicyDocs: () => chatbotRequest('/policy_upload/documents'),
  viewPolicyDoc: (id: number) => chatbotDownload(`/policy_upload/${id}/view`),
  deletePolicyDoc: (id: number) => chatbotRequest(`/policy_upload/${id}`, { method: 'DELETE' }),

  // Auth & user — login/verify-otp/signup-complete set an httpOnly cookie
  // server-side; nothing is returned here for the client to store.
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
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  setPassword: (email: string, token: string, password: string) =>
    request('/api/auth/set-password', { method: 'POST', body: JSON.stringify({ email, token, password }) }),
  getMe: () => request('/api/users/me'),
  getWallet: () => request('/api/users/wallet'),
  getLeaderboard: () => request('/api/users/leaderboard'),
  updateProfile: (body: { name?: string; designation?: string }) =>
    request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  // Per-user preferences (theme + notification toggles), persisted server
  // side against the account — not per-browser, so they follow the person
  // to any machine they log in from.
  getPreferences: () => request('/api/users/me/preferences'),
  updatePreferences: (body: { theme?: 'light' | 'dark'; ticketUpdates?: boolean; recognitions?: boolean; weeklySummary?: boolean }) =>
    request('/api/users/me/preferences', { method: 'PATCH', body: JSON.stringify(body) }),

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
    const res = await fetch(`${BASE}/api/work-log/export${q.toString() ? `?${q}` : ''}`, { credentials: 'include' });
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
