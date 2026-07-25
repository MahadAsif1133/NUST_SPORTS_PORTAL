const API_BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/v1'
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api/v1`
);

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    else localStorage.removeItem('accessToken');
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');
  }

  clearTokens() {
    this.setTokens(null, null);
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...options.headers };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle token expiry
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers, body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined });
        return this.handleResponse(retryResponse);
      }
    }

    return this.handleResponse(response);
  }

  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      let message = data.message || 'Request failed';
      if (response.status === 429) {
        message = 'Too many attempts — please wait a moment and try again';
      }
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  async tryRefresh() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          this.setTokens(data.accessToken, this.refreshToken);
          this.refreshPromise = null;
          return true;
        } else if (res.status === 401 || res.status === 403) {
          this.clearTokens();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } catch (err) {
        console.error('Token refresh network or connection error:', err.message);
      }
      this.refreshPromise = null;
      return false;
    })();

    return this.refreshPromise;
  }

  // ─── Auth ───
  loginStudent(registrationNumber, password) {
    return this.request('/auth/login', { method: 'POST', body: { registrationNumber, password } });
  }
  loginEmail(email, password) {
    return this.request('/auth/login', { method: 'POST', body: { email, password } });
  }
  registerStudent(registrationNumber, password) {
    return this.request('/auth/register/student', { method: 'POST', body: { registrationNumber, password } });
  }
  registerNative(data) {
    return this.request('/auth/register/native', { method: 'POST', body: data });
  }
  verifyOTP(userId, otp) {
    return this.request('/auth/verify-otp', { method: 'POST', body: { userId, otp } });
  }
  resendOTP(email) {
    return this.request('/auth/resend-otp', { method: 'POST', body: { email } });
  }
  getMe() {
    return this.request('/auth/me');
  }
  logout() {
    const rt = this.refreshToken;
    return this.request('/auth/logout', { method: 'POST', body: { refreshToken: rt } });
  }

  // ─── Memberships ───
  applyMembership(data) {
    return this.request('/memberships', { method: 'POST', body: data });
  }
  getMyMemberships() {
    return this.request('/memberships/my');
  }
  getMembership(id) {
    return this.request(`/memberships/${id}`);
  }
  cancelMembership(id, reason) {
    return this.request(`/memberships/${id}/cancel`, { method: 'POST', body: { reason } });
  }
  addFamilyMember(data) {
    return this.request('/memberships/family-members', { method: 'POST', body: data });
  }
  getMyFamilyMembers() {
    return this.request('/memberships/family-members');
  }
  resubmitFamilyMember(id, data) {
    return this.request(`/memberships/family-members/${id}/resubmit`, { method: 'PUT', body: data });
  }
  updateChildSubscriptions(familyMemberId, selectedFacilities) {
    return this.request(`/memberships/family-members/${familyMemberId}/subscriptions`, { method: 'POST', body: { selectedFacilities } });
  }
  removeFamilyMember(memberId) {
    return this.request(`/memberships/family-members/${memberId}`, { method: 'DELETE' });
  }
  calculateSubscriptionFee(selectedFacilities) {
    return this.request('/memberships/subscriptions/calculate', { method: 'POST', body: { selectedFacilities } });
  }
  updateSubscriptions(membershipId, selectedFacilities) {
    return this.request(`/memberships/${membershipId}/subscriptions`, { method: 'POST', body: { selectedFacilities } });
  }


  // ─── Payments ───
  initiatePayment(data, idempotencyKey) {
    return this.request('/payments/initiate', {
      method: 'POST', body: data,
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    });
  }
  uploadBankSlip(formData) {
    return this.request('/payments/bank-slip/upload', { method: 'POST', body: formData });
  }
  getMyPayments() {
    return this.request('/payments/my');
  }

  // ─── Cards ───
  getMyCards() {
    return this.request('/cards/my');
  }
  getQRToken(cardId) {
    return this.request(`/cards/${cardId}/qr`);
  }
  getECard(cardId) {
    return fetch(`${API_BASE}/cards/${cardId}/ecard`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }
  reportLost(cardId) {
    return this.request(`/cards/${cardId}/report-lost`, { method: 'POST' });
  }

  // ─── Freeze ───
  requestFreeze(data) {
    return this.request('/freeze', { method: 'POST', body: data });
  }
  getMyFreezeRequests() {
    return this.request('/freeze/my');
  }

  // ─── Facilities ───
  getFacilities() {
    return this.request('/facilities');
  }
  getFacilityRates(id) {
    return this.request(`/facilities/${id}/rates`);
  }
  getAllRates() {
    return this.request('/facilities/rates');
  }
  getFacilitySchedule(id) {
    return this.request(`/facilities/${id}/schedule`);
  }

  // ─── Admin ───
  adminGetUsers(params) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/users?${qs}`);
  }
  adminVerifyUser(id, data) {
    return this.request(`/admin/users/${id}/verify`, { method: 'PATCH', body: data });
  }
  adminGetMemberships(params) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/memberships?${qs}`);
  }
  adminGetPendingSlips() {
    return this.request('/admin/payments/pending-slips');
  }
  adminVerifySlip(id, data) {
    return this.request(`/admin/payments/${id}/verify-slip`, { method: 'PATCH', body: data });
  }
  adminGetPendingFreezes() {
    return this.request('/admin/freeze-requests');
  }
  adminDecideFreeze(id, data) {
    return this.request(`/admin/freeze-requests/${id}`, { method: 'PATCH', body: data });
  }
  adminGetPendingFamilyMembers() {
    return this.request('/admin/family-members/pending');
  }
  adminDecideFamilyMember(id, data) {
    return this.request(`/admin/family-members/${id}/decide`, { method: 'PATCH', body: data });
  }
  adminMarkCardReady(id) {
    return this.request(`/admin/cards/${id}/ready`, { method: 'PATCH' });
  }
  adminMarkCardCollected(id) {
    return this.request(`/admin/cards/${id}/collected`, { method: 'PATCH' });
  }
  adminGetStats() {
    return this.request('/admin/stats');
  }
  adminGetFacilityMembers(facility) {
    return this.request(`/admin/facility-members?facility=${facility}`);
  }

  // ─── Trainer ───
  trainerScan(data) {
    return this.request('/trainer/scan', { method: 'POST', body: data });
  }
  trainerVerifyCard(data) {
    return this.request('/trainer/verify-card', { method: 'POST', body: data });
  }
  trainerLookupCard(cardNumber) {
    return this.request('/trainer/lookup-card', { method: 'POST', body: { cardNumber } });
  }
  trainerGetAttendance(params) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/trainer/attendance?${qs}`);
  }

  // ─── Audit ───
  getAuditLogs(params) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/audit?${qs}`);
  }

  // ─── Chatbot ───
  sendChatMessage(message) {
    return this.request('/chatbot/message', { method: 'POST', body: { message } });
  }
  getChatTopics() {
    return this.request('/chatbot/topics');
  }
}

const api = new ApiClient();
export default api;
