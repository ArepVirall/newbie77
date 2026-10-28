import {
  AdminAccount,
  AdminSettings,
  AttendanceRecord,
  AuditLogItem,
  LeaveItem,
  RejectedAttendance,
  ServerTimeResponse,
  TechnicianItem,
  UserSession,
  WorkLocation,
} from '../types';

const API_BASE = '/api';

export const api = {
  // 1. Time
  async getServerTime(): Promise<ServerTimeResponse> {
    const res = await fetch(`${API_BASE}/time`);
    const json = await res.json();
    return json.data;
  },

  // 2. Auth
  async login(username: string, password: string, loginType?: 'admin' | 'technician') {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, loginType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login gagal');
    return data;
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string, userType: 'admin' | 'technician') {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, oldPassword, newPassword, userType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengubah kata sandi');
    return data;
  },

  async recoverAdmin(recoveryCode: string, newPassword?: string) {
    const res = await fetch(`${API_BASE}/auth/recover-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memulihkan kata sandi');
    return data;
  },

  // 3. Admin Overview
  async getAdminOverview() {
    const res = await fetch(`${API_BASE}/admin/overview`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat ringkasan admin');
    return data.data;
  },

  // 4. Work Locations (PENGATURAN LOKASI ABSENSI & RADIUS 300 METER)
  async getWorkLocations(): Promise<WorkLocation[]> {
    const res = await fetch(`${API_BASE}/admin/work-locations`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat lokasi kerja');
    return data.data;
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
    const res = await fetch(`${API_BASE}/admin/work-locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menambahkan lokasi kerja');
    return data;
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
    const res = await fetch(`${API_BASE}/admin/work-locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui lokasi kerja');
    return data;
  },

  async deleteWorkLocation(id: string, adminActorId?: string, adminActorName?: string) {
    const res = await fetch(`${API_BASE}/admin/work-locations/${id}?adminActorId=${adminActorId || ''}&adminActorName=${adminActorName || ''}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus lokasi kerja');
    return data;
  },

  async getRejectedAttendances(): Promise<RejectedAttendance[]> {
    const res = await fetch(`${API_BASE}/admin/rejected-attendances`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat riwayat penolakan');
    return data.data;
  },

  // 5. Technicians
  async getTechnicians(): Promise<TechnicianItem[]> {
    const res = await fetch(`${API_BASE}/admin/technicians`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat teknisi');
    return data.data;
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
    const res = await fetch(`${API_BASE}/admin/technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mendaftarkan teknisi');
    return data;
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
    const res = await fetch(`${API_BASE}/admin/technicians/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui teknisi');
    return data;
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
    const res = await fetch(`${API_BASE}/admin/attendances?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat absensi');
    return data.data;
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
    const res = await fetch(`${API_BASE}/admin/attendances/${id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengoreksi absensi');
    return data;
  },

  // 7. Admin accounts management
  async getAdmins(): Promise<AdminAccount[]> {
    const res = await fetch(`${API_BASE}/admin/admins`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat admin');
    return data.data;
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
    const res = await fetch(`${API_BASE}/admin/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menambahkan admin');
    return data;
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
    const res = await fetch(`${API_BASE}/admin/admins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui admin');
    return data;
  },

  async deleteAdmin(id: string, adminActorId?: string, adminActorName?: string) {
    const res = await fetch(`${API_BASE}/admin/admins/${id}?adminActorId=${adminActorId || ''}&adminActorName=${adminActorName || ''}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencabut akses admin');
    return data;
  },

  // 8. Settings
  async getSettings(): Promise<AdminSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat pengaturan');
    return data.data;
  },

  async updateSettings(payload: Partial<AdminSettings> & { adminActorId?: string; adminActorName?: string }) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menyimpan pengaturan');
    return data;
  },

  // 9. Audit Logs
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE}/admin/audit-logs`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat audit log');
    return data.data;
  },

  // 10. Leaves
  async getLeaves(): Promise<LeaveItem[]> {
    const res = await fetch(`${API_BASE}/admin/leaves`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat daftar izin/sakit');
    return data.data;
  },

  async reviewLeave(id: string, status: 'approved' | 'rejected', reviewNote?: string, adminActorId?: string, adminActorName?: string) {
    const res = await fetch(`${API_BASE}/admin/leaves/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNote, adminActorId, adminActorName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memproses permohonan');
    return data;
  },

  // 11. Technician Dashboard & Attendance
  async getTechnicianDashboard(id: string) {
    const res = await fetch(`${API_BASE}/technician/dashboard/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat data teknisi');
    return data.data;
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
    const res = await fetch(`${API_BASE}/technician/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal merekam absensi');
    return data;
  },

  async enrollFace(payload: { technicianId: string; photoBase64: string; livenessPassed?: boolean }) {
    const res = await fetch(`${API_BASE}/technician/face-enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mendaftarkan wajah');
    return data;
  },

  async submitLeave(payload: {
    technicianId: string;
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentNote?: string;
  }) {
    const res = await fetch(`${API_BASE}/technician/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengirim pengajuan izin');
    return data;
  },

  // 12. Google Sync
  async recordGoogleSync(payload: {
    spreadsheetId?: string;
    driveFolderId?: string;
    adminActorId?: string;
    adminActorName?: string;
  }) {
    const res = await fetch(`${API_BASE}/admin/google-sync/record-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencatat status sinkronisasi');
    return data;
  },

  async getGoogleSyncStatus() {
    const res = await fetch(`${API_BASE}/admin/google-sync/status`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat status sinkronisasi');
    return data.data;
  },
};
