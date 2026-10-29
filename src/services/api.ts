import {
  AdminAccount,
  AdminSettings,
  AttendanceRecord,
  AuditLogItem,
  EmailNotificationSettings,
  LeaveItem,
  PasswordResetVerifyResponse,
  RejectedAttendance,
  ServerTimeResponse,
  TechnicianItem,
  UserSession,
  WorkLocation,
} from '../types';

const API_BASE = '/api';

/**
 * Robust API fetcher that guarantees safety against:
 * 1. "Unexpected end of JSON input" on Netlify / empty responses
 * 2. HTML 404/502 error pages returned by CDN / proxies
 * 3. Network abort / timeout issues
 */
async function safeRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 20000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Read as raw text first to avoid Response.json() JSON parse exception on HTML/empty response
    const rawText = await res.text();
    let parsed: any = null;

    if (rawText && rawText.trim().length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn(`[API] Respon non-JSON diterima dari ${url} (HTTP ${res.status}):`, rawText.slice(0, 160));
        if (!res.ok) {
          throw new Error(`Server mengembalikan respon tidak terduga (Status ${res.status}). Pastikan endpoint backend aktif.`);
        }
        throw new Error('Respon server bukan format JSON yang valid.');
      }
    } else {
      if (!res.ok) {
        throw new Error(`Permintaan gagal dengan status ${res.status} (${res.statusText || 'Respon kosong'}).`);
      }
      return {} as T;
    }

    if (!res.ok) {
      const errorMsg = parsed?.message || parsed?.error || `Permintaan gagal (Status ${res.status})`;
      throw new Error(errorMsg);
    }

    return parsed as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Waktu permintaan habis (Timeout 20s). Periksa koneksi internet Anda atau coba lagi.');
    }
    throw err;
  }
}

export const api = {
  // 1. Time
  async getServerTime(): Promise<ServerTimeResponse> {
    const res = await safeRequest<{ status: string; data: ServerTimeResponse }>('/time');
    return res.data;
  },

  // 2. Auth
  async login(username: string, password: string, loginType?: 'admin' | 'technician'): Promise<{ status: string; token: string; user: UserSession }> {
    return safeRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, loginType }),
    });
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string, userType: 'admin' | 'technician') {
    return safeRequest('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, oldPassword, newPassword, userType }),
    });
  },

  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    return safeRequest('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },

  async verifyResetToken(token: string): Promise<PasswordResetVerifyResponse> {
    return safeRequest(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
  },

  async resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
    return safeRequest('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async recoverAdmin(recoveryCode: string, newPassword?: string) {
    return safeRequest('/auth/recover-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode, newPassword }),
    });
  },

  // 3. Admin Overview
  async getAdminOverview() {
    const res = await safeRequest<{ status: string; data: any }>('/admin/overview');
    return res.data;
  },

  // 4. Work Locations (PENGATURAN LOKASI ABSENSI & RADIUS 300 METER)
  async getWorkLocations(): Promise<WorkLocation[]> {
    const res = await safeRequest<{ status: string; data: WorkLocation[] }>('/admin/work-locations');
    return res.data;
  },

  async createWorkLocation(payload: {
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    assignedTechIds?: string[];
    adminActorId?: string;
    adminActorName?: string;
  }) {
    return safeRequest('/admin/work-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateWorkLocation(
    id: string,
    payload: {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
      assignedTechIds?: string[];
      isActive?: boolean;
      adminActorId?: string;
      adminActorName?: string;
    }
  ) {
    return safeRequest(`/admin/work-locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteWorkLocation(id: string, adminActorId?: string, adminActorName?: string) {
    return safeRequest(`/admin/work-locations/${id}?adminActorId=${adminActorId || ''}&adminActorName=${adminActorName || ''}`, {
      method: 'DELETE',
    });
  },

  async getRejectedAttendances(): Promise<RejectedAttendance[]> {
    const res = await safeRequest<{ status: string; data: RejectedAttendance[] }>('/admin/rejected-attendances');
    return res.data;
  },

  // 5. Technicians
  async getTechnicians(): Promise<TechnicianItem[]> {
    const res = await safeRequest<{ status: string; data: TechnicianItem[] }>('/admin/technicians');
    return res.data;
  },

  async createTechnician(payload: {
    fullName: string;
    phone: string;
    email: string;
    role: string;
    workArea: string;
    workLocationId?: string;
    initialPassword: string;
    adminActorId?: string;
    adminActorName?: string;
  }) {
    return safeRequest('/admin/technicians', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateTechnician(
    id: string,
    payload: {
      fullName?: string;
      phone?: string;
      email?: string;
      role?: string;
      workArea?: string;
      workLocationId?: string;
      status?: 'active' | 'inactive';
      resetPassword?: string;
      adminActorId?: string;
      adminActorName?: string;
    }
  ) {
    return safeRequest(`/admin/technicians/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  // 6. Attendances
  async getAttendances(filters?: {
    date?: string;
    month?: string;
    year?: string;
    status?: string;
    technicianId?: string;
    workLocationId?: string;
    search?: string;
  }): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.date) params.append('date', filters.date);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.status) params.append('status', filters.status);
      if (filters.technicianId) params.append('technicianId', filters.technicianId);
      if (filters.workLocationId) params.append('workLocationId', filters.workLocationId);
      if (filters.search) params.append('search', filters.search);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await safeRequest<{ status: string; data: AttendanceRecord[] }>(`/admin/attendances${query}`);
    return res.data;
  },

  async correctAttendance(
    id: string,
    payload: {
      newStatus?: string;
      newTimeWib?: string;
      reason: string;
      adminActorId?: string;
      adminActorName?: string;
    }
  ) {
    return safeRequest(`/admin/attendances/${id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  // 7. Admin accounts management
  async getAdmins(): Promise<AdminAccount[]> {
    const res = await safeRequest<{ status: string; data: AdminAccount[] }>('/admin/admins');
    return res.data;
  },

  async createAdmin(payload: {
    fullName: string;
    email: string;
    phone?: string;
    initialPassword: string;
    role?: 'superadmin' | 'full_access' | 'admin' | 'viewer';
    adminActorId?: string;
    adminActorName?: string;
  }) {
    return safeRequest('/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateAdmin(
    id: string,
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: 'active' | 'disabled';
      resetPassword?: string;
      adminActorId?: string;
      adminActorName?: string;
    }
  ) {
    return safeRequest(`/admin/admins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteAdmin(id: string, adminActorId?: string, adminActorName?: string) {
    return safeRequest(`/admin/admins/${id}?adminActorId=${adminActorId || ''}&adminActorName=${adminActorName || ''}`, {
      method: 'DELETE',
    });
  },

  // 8. Settings
  async getSettings(): Promise<AdminSettings> {
    const res = await safeRequest<{ status: string; data: AdminSettings }>('/admin/settings');
    return res.data;
  },

  async updateSettings(payload: Partial<AdminSettings> & { adminActorId?: string; adminActorName?: string }) {
    return safeRequest('/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateEmailSettings(payload: {
    enabled?: boolean;
    adminEmail?: string;
    notifyAdminLogin?: boolean;
    notifyTechnicianLogin?: boolean;
    notifyPasswordChanged?: boolean;
    testSend?: boolean;
    adminActorId?: string;
    adminActorName?: string;
  }): Promise<{ status: string; message: string; data: EmailNotificationSettings & { testResult?: any } }> {
    return safeRequest('/admin/settings/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  // 9. Audit Logs
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await safeRequest<{ status: string; data: AuditLogItem[] }>('/admin/audit-logs');
    return res.data;
  },

  // 10. Leaves
  async getLeaves(): Promise<LeaveItem[]> {
    const res = await safeRequest<{ status: string; data: LeaveItem[] }>('/admin/leaves');
    return res.data;
  },

  async reviewLeave(id: string, status: 'approved' | 'rejected', reviewNote?: string, adminActorId?: string, adminActorName?: string) {
    return safeRequest(`/admin/leaves/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNote, adminActorId, adminActorName }),
    });
  },

  // 11. Technician Dashboard & Attendance
  async getTechnicianDashboard(id: string) {
    const res = await safeRequest<{ status: string; data: any }>(`/technician/dashboard/${id}`);
    return res.data;
  },

  async submitAttendance(payload: {
    technicianId: string;
    type: 'masuk' | 'pulang';
    photoBase64: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName?: string;
    targetLocationId?: string;
    deviceTimestamp?: string;
    livenessPassed?: boolean;
  }) {
    return safeRequest('/technician/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async enrollFace(payload: { technicianId: string; photoBase64: string; livenessPassed?: boolean }) {
    return safeRequest('/technician/face-enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async submitLeave(payload: {
    technicianId: string;
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentNote?: string;
  }) {
    return safeRequest('/technician/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  // 12. Google Sync
  async recordGoogleSync(payload: {
    spreadsheetId?: string;
    driveFolderId?: string;
    adminActorId?: string;
    adminActorName?: string;
  }) {
    return safeRequest('/admin/google-sync/record-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getGoogleSyncStatus() {
    const res = await safeRequest<{ status: string; data: any }>('/admin/google-sync/status');
    return res.data;
  },
};
