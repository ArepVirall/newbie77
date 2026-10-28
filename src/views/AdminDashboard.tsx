import React, { useEffect, useState } from 'react';
import {
  AdminAccount,
  AdminSettings,
  AttendanceRecord,
  AuditLogItem,
  LeaveItem,
  RejectedAttendance,
  TechnicianItem,
  UserSession,
  WorkLocation,
} from '../types';
import { api } from '../services/api';
import { LeafletMap } from '../components/LeafletMap';
import { ExportModal } from '../components/ExportModal';
import { googleSync } from '../services/googleSync';
import { getCachedAccessToken, googleSignIn, googleSignOut } from '../services/firebase';
import { reverseGeocode } from '../utils/geo';
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Calendar,
  Settings,
  Shield,
  FileSpreadsheet,
  Cloud,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ExternalLink,
  MapPin,
  Camera,
  Plus,
  X,
  HelpCircle,
  FileCheck,
  Smartphone,
  Navigation,
  Building2,
  ShieldAlert,
  Download,
  Crosshair,
} from 'lucide-react';

interface AdminDashboardProps {
  user: UserSession;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attendances' | 'locations' | 'technicians' | 'leaves' | 'android-apk' | 'google-sync' | 'settings' | 'admins' | 'audit'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [rejectedAttendances, setRejectedAttendances] = useState<RejectedAttendance[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Filters for Attendance Table
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLocationId, setFilterLocationId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [inspectAttendance, setInspectAttendance] = useState<AttendanceRecord | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState<string>('TEPAT WAKTU');
  const [correctionTime, setCorrectionTime] = useState('');

  // Work Location Modal (Pengaturan Lokasi & Radius 300 Meter)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locLatitude, setLocLatitude] = useState<number>(-6.2088);
  const [locLongitude, setLocLongitude] = useState<number>(106.8456);
  const [locRadius, setLocRadius] = useState<number>(300); // 300 meter default
  const [locGpsLoading, setLocGpsLoading] = useState(false);

  // Technician Form Modal
  const [showTechModal, setShowTechModal] = useState(false);
  const [techFullName, setTechFullName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techRole, setTechRole] = useState('');
  const [techWorkArea, setTechWorkArea] = useState('');
  const [techWorkLocId, setTechWorkLocId] = useState('');
  const [techInitialPassword, setTechInitialPassword] = useState('teknisi123');

  // Edit Tech Modal
  const [editingTech, setEditingTech] = useState<TechnicianItem | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  // Add Admin Modal (Formulir Admin Lengkap)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('adminBaru2026');
  const [newAdminRole, setNewAdminRole] = useState<'full_access' | 'admin' | 'viewer'>('full_access');

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<AdminSettings | null>(null);

  // Google Sync State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [syncPercentage, setSyncPercentage] = useState<number>(0);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

  // General Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load all admin data
  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, attData, locData, rejData, techData, leaveData, setData, adminData, auditData] =
        await Promise.all([
          api.getAdminOverview(),
          api.getAttendances(),
          api.getWorkLocations(),
          api.getRejectedAttendances(),
          api.getTechnicians(),
          api.getLeaves(),
          api.getSettings(),
          api.getAdmins(),
          api.getAuditLogs(),
        ]);

      setStats(overviewData.stats);
      setAttendances(attData);
      setWorkLocations(locData);
      setRejectedAttendances(rejData);
      setTechnicians(techData);
      setLeaves(leaveData);
      setSettings(setData);
      setSettingsForm(setData);
      setAdmins(adminData);
      setAuditLogs(auditData);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal memuat data admin.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Use Device GPS for Work Location
  const handleCaptureAdminGPS = () => {
    if (!navigator.geolocation) {
      alert('Perangkat tidak mendukung GPS.');
      return;
    }
    setLocGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocLatitude(lat);
        setLocLongitude(lng);

        const addr = await reverseGeocode(lat, lng);
        setLocAddress(addr);
        setLocGpsLoading(false);
      },
      (err) => {
        console.error('GPS error:', err);
        alert('Gagal mengambil titik GPS perangkat Anda. Pastikan izin lokasi aktif.');
        setLocGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Map Click to Set Location
  const handleMapClick = async (lat: number, lng: number) => {
    if (activeTab === 'locations' && showLocationModal) {
      setLocLatitude(lat);
      setLocLongitude(lng);
      const addr = await reverseGeocode(lat, lng);
      setLocAddress(addr);
    }
  };

  // Save Work Location (Add or Edit)
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName || typeof locLatitude !== 'number' || typeof locLongitude !== 'number') return;

    try {
      if (editingLocation) {
        await api.updateWorkLocation(editingLocation.id, {
          name: locName,
          address: locAddress,
          latitude: locLatitude,
          longitude: locLongitude,
          radiusMeters: locRadius || 300,
          adminActorId: user.id,
          adminActorName: user.fullName,
        });
        setNotification({
          type: 'success',
          message: `Titik lokasi "${locName}" dengan radius ${locRadius} meter berhasil diperbarui!`,
        });
      } else {
        await api.createWorkLocation({
          name: locName,
          address: locAddress,
          latitude: locLatitude,
          longitude: locLongitude,
          radiusMeters: locRadius || 300,
          adminActorId: user.id,
          adminActorName: user.fullName,
        });
        setNotification({
          type: 'success',
          message: `Titik lokasi kerja baru "${locName}" dengan radius ${locRadius} meter berhasil ditambahkan!`,
        });
      }

      setShowLocationModal(false);
      setEditingLocation(null);
      setLocName('');
      setLocAddress('');
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal menyimpan titik lokasi.' });
    }
  };

  // Delete Work Location
  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus titik lokasi kerja "${name}"?`)) return;
    try {
      await api.deleteWorkLocation(id, user.id, user.fullName);
      setNotification({ type: 'success', message: `Lokasi "${name}" berhasil dihapus.` });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal menghapus lokasi.' });
    }
  };

  // Add Admin Account (Full access)
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdmin({
        fullName: newAdminFullName,
        email: newAdminEmail,
        phone: newAdminPhone,
        initialPassword: newAdminPassword,
        role: newAdminRole,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });

      setNotification({
        type: 'success',
        message: `Admin ${newAdminFullName} (${newAdminEmail}) berhasil dibuat dengan hak akses ${newAdminRole.toUpperCase()}! Akun dapat langsung login.`,
      });
      setShowAddAdminModal(false);
      setNewAdminFullName('');
      setNewAdminEmail('');
      setNewAdminPhone('');
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal menambahkan admin.' });
    }
  };

  // Toggle Admin Status
  const handleToggleAdminStatus = async (adminId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await api.updateAdmin(adminId, {
        status: nextStatus,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });
      setNotification({
        type: 'success',
        message: `Status admin berhasil diubah menjadi ${nextStatus.toUpperCase()}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal mengubah status admin.' });
    }
  };

  // Revoke Admin
  const handleDeleteAdmin = async (adminId: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin mencabut seluruh akses dan menghapus admin "${name}"?`)) return;
    try {
      await api.deleteAdmin(adminId, user.id, user.fullName);
      setNotification({ type: 'success', message: `Akses admin "${name}" berhasil dicabut.` });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal menghapus admin.' });
    }
  };

  // Submit Manual Attendance Correction
  const handleSaveCorrection = async () => {
    if (!correctionTarget || !correctionReason) return;
    try {
      await api.correctAttendance(correctionTarget.id, {
        newStatus: correctionStatus,
        newTimeWib: correctionTime || correctionTarget.localTimeWib,
        reason: correctionReason,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });

      setNotification({
        type: 'success',
        message: `Koreksi absensi ${correctionTarget.technicianName} berhasil disimpan dengan catatan audit!`,
      });
      setCorrectionTarget(null);
      setCorrectionReason('');
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal mengoreksi absensi.' });
    }
  };

  // Submit Add Technician
  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTechnician({
        fullName: techFullName,
        phone: techPhone,
        email: techEmail,
        role: techRole,
        workArea: techWorkArea,
        workLocationId: techWorkLocId || undefined,
        initialPassword: techInitialPassword,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });

      setNotification({
        type: 'success',
        message: `Teknisi ${techFullName} berhasil didaftarkan! Password awal wajib diubah saat login pertama.`,
      });
      setShowTechModal(false);
      setTechFullName('');
      setTechPhone('');
      setTechEmail('');
      setTechRole('');
      setTechWorkArea('');
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal mendaftarkan teknisi.' });
    }
  };

  // Update Technician Info & Reset Password
  const handleUpdateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;
    try {
      await api.updateTechnician(editingTech.id, {
        fullName: editingTech.fullName,
        phone: editingTech.phone,
        email: editingTech.email,
        role: editingTech.role,
        workArea: editingTech.workArea,
        workLocationId: editingTech.workLocationId,
        status: editingTech.status,
        resetPassword: resetPasswordInput || undefined,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });

      setNotification({
        type: 'success',
        message: `Data teknisi ${editingTech.fullName} berhasil diperbarui!`,
      });
      setEditingTech(null);
      setResetPasswordInput('');
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal memperbarui teknisi.' });
    }
  };

  // Toggle Technician Active/Inactive
  const handleToggleTechStatus = async (tech: TechnicianItem) => {
    const newStatus = tech.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateTechnician(tech.id, {
        status: newStatus,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });
      setNotification({
        type: 'success',
        message: `Status teknisi ${tech.fullName} diubah menjadi ${newStatus === 'active' ? 'AKTIF' : 'NONAKTIF'}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal mengubah status teknisi.' });
    }
  };

  // Review Leave
  const handleReviewLeave = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      await api.reviewLeave(leaveId, status, `Ditinjau oleh ${user.fullName}`, user.id, user.fullName);
      setNotification({
        type: 'success',
        message: `Pengajuan izin berhasil ${status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal memproses izin.' });
    }
  };

  // Save General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    try {
      await api.updateSettings({
        ...settingsForm,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });
      setNotification({
        type: 'success',
        message: 'Pengaturan jam kerja 08:30 WIB dan radius 300 meter berhasil disimpan!',
      });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Gagal menyimpan pengaturan.' });
    }
  };

  // Trigger Google Sync
  const handleRunGoogleSync = async () => {
    let token = getCachedAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setGoogleUser(res.user);
        }
      } catch (err: any) {
        setNotification({ type: 'error', message: 'Izin Google OAuth diperlukan untuk sinkronisasi data.' });
        return;
      }
    }

    if (!token || !settings) return;

    try {
      setSyncInProgress(true);
      setSyncResult(null);

      const result = await googleSync.syncAllData(
        token,
        settings.googleSpreadsheetId,
        {
          admins,
          technicians,
          attendances,
          leaves,
          settings,
          auditLogs,
        },
        (step, pct) => {
          setSyncStatusText(step);
          setSyncPercentage(pct);
        }
      );

      await api.recordGoogleSync({
        spreadsheetId: result.spreadsheetId,
        driveFolderId: result.driveFolderId,
        adminActorId: user.id,
        adminActorName: user.fullName,
      });

      setSyncResult(result);
      setNotification({
        type: 'success',
        message: result.message,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menyinkronkan data ke Google Sheets & Drive.',
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  // Filtered Attendances
  const filteredAttendances = attendances.filter((att) => {
    const matchDate = filterDate ? att.workDate === filterDate : true;
    const matchStatus = filterStatus === 'ALL' ? true : att.lateStatus === filterStatus;
    const matchLoc = filterLocationId === 'ALL' ? true : att.workLocationId === filterLocationId;
    const matchSearch = searchQuery
      ? att.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        att.technicianCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        att.technicianPhone.includes(searchQuery)
      : true;
    return matchDate && matchStatus && matchLoc && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold underline">
            Tutup
          </button>
        </div>
      )}

      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard Manajemen Absensi
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ONLINE AKTIF
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Batas Masuk: 08:30 WIB &bull; <b>Radius Wajib 300 Meter</b> &bull; Kamera Langsung Anti-Manipulasi
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowTechModal(true);
              setTechFullName('');
              setTechPhone('');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Teknisi</span>
          </button>

          <button
            onClick={() => {
              setShowAddAdminModal(true);
              setNewAdminFullName('');
              setNewAdminEmail('');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Tambah Admin</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('locations');
              setShowLocationModal(true);
              setEditingLocation(null);
              setLocName('');
              setLocRadius(300);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Atur Lokasi</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Laporan</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS (WITH RADIUS REJECTION STAT) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Teknisi */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Teknisi</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats ? stats.activeTechnicians : technicians.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {technicians.filter((t) => t.status === 'active').length} akun aktif
          </div>
        </div>

        {/* Hadir Hari Ini */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Hadir Hari Ini</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats ? stats.presentToday : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {stats ? stats.checkoutToday : 0} sudah absen pulang
          </div>
        </div>

        {/* Tepat Waktu */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Tepat Waktu</span>
            <Clock className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
            {stats ? stats.onTimeCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">&le; 08:30:00 WIB</div>
        </div>

        {/* Terlambat */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Terlambat</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats ? stats.lateCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">&gt; 08:30:00 WIB</div>
        </div>

        {/* Ditolak Karena Radius (NEW STRICT STAT!) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Ditolak (Radius)</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats ? stats.rejectedRadiusCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Jarak &gt; 300 meter</div>
        </div>

        {/* Belum Absen */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Belum Absen</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300">
            {stats ? stats.notPresentCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {workLocations.filter((l) => l.isActive).length} lokasi kerja aktif
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 text-xs font-bold scrollbar-none pb-1">
        {[
          { id: 'overview', label: 'Peta Sebaran Real-Time', icon: MapPin },
          { id: 'attendances', label: `Daftar Absensi (${attendances.length})`, icon: Clock },
          { id: 'locations', label: `Pengaturan Lokasi Absensi (${workLocations.length})`, icon: Building2 },
          { id: 'technicians', label: `Kelola Teknisi (${technicians.length})`, icon: Users },
          { id: 'leaves', label: `Izin & Sakit (${leaves.length})`, icon: Calendar },
          { id: 'android-apk', label: 'Aplikasi Android & APK', icon: Smartphone },
          { id: 'google-sync', label: 'Sinkronisasi Google', icon: Cloud },
          { id: 'settings', label: 'Pengaturan Jam & GPS', icon: Settings },
          { id: 'admins', label: 'Manajemen Admin & Hak Akses', icon: Shield },
          { id: 'audit', label: 'Log Audit Keamanan', icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition ${
                isActive
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 rounded-t-xl'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & MAP */}
      {activeTab === 'overview' && settings && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-500" />
                Peta Monitoring Titik Lokasi Resmi & Presensi Teknisi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lingkaran biru putus-putus menunjukkan batas radius wajib 300 meter untuk masing-masing titik proyek / kantor.
              </p>
            </div>
          </div>

          <LeafletMap
            settings={settings}
            workLocations={workLocations}
            attendances={attendances}
            selectedAttendance={inspectAttendance}
            onSelectAttendance={(att) => setInspectAttendance(att)}
            height="460px"
          />
        </div>
      )}

      {/* TAB 2: ATTENDANCES TABLE */}
      {activeTab === 'attendances' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, ID, atau No HP..."
                className="w-full md:w-64 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />

              <select
                value={filterLocationId}
                onChange={(e) => setFilterLocationId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Semua Titik Lokasi</option>
                {workLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Semua Status</option>
                <option value="TEPAT WAKTU">Tepat Waktu (&le; 08:30 WIB)</option>
                <option value="TERLAMBAT">Terlambat (&gt; 08:30 WIB)</option>
                <option value="PULANG">Absen Pulang</option>
              </select>

              {(filterDate || filterStatus !== 'ALL' || filterLocationId !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterDate('');
                    setFilterStatus('ALL');
                    setFilterLocationId('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-500 font-semibold underline px-2"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-3">Foto</th>
                    <th className="py-3.5 px-3">ID & Nama Teknisi</th>
                    <th className="py-3.5 px-3">Tanggal & Jenis</th>
                    <th className="py-3.5 px-3">Jam Server (WIB)</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Titik Lokasi Resmi</th>
                    <th className="py-3.5 px-3">Jarak dari Titik</th>
                    <th className="py-3.5 px-3">Verifikasi Wajah</th>
                    <th className="py-3.5 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tidak ada catatan absensi yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendances.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          {att.photoBase64 ? (
                            <img
                              src={att.photoBase64}
                              alt="Foto"
                              onClick={() => setInspectAttendance(att)}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Camera className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{att.technicianName}</div>
                          <div className="text-[11px] text-slate-400">
                            {att.technicianCode} &bull; {att.technicianPhone}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{att.workDate}</div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            {att.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">{att.localTimeWib}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              att.lateStatus === 'TEPAT WAKTU'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : att.lateStatus === 'TERLAMBAT'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            }`}
                          >
                            {att.lateStatus}
                            {att.minutesLate > 0 && ` (+${att.minutesLate}m)`}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[170px] truncate" title={att.workLocationName || att.locationName}>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {att.workLocationName || 'Kantor'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{att.locationName}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          {att.distanceToOfficeMeters}m (&le; {att.maxAllowedRadiusMeters || 300}m)
                        </td>
                        <td className="py-3 px-3">
                          {att.livenessPassed ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" /> Lulus Liveness
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Manual</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectAttendance(att)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                              title="Lihat Detail Foto & GPS"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setCorrectionTarget(att);
                                setCorrectionStatus(att.lateStatus);
                                setCorrectionTime(att.localTimeWib);
                                setCorrectionReason('');
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition"
                              title="Koreksi Manual dengan Audit Log"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table of Rejected Attendances (Radius Violations) */}
          {rejectedAttendances.length > 0 && (
            <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/40 p-5 space-y-3">
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Catatan Penolakan Absensi (Di Luar Radius 300 Meter)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 dark:text-slate-400 border-b border-rose-200 dark:border-rose-900/40">
                    <tr>
                      <th className="py-2 px-3">Waktu (WIB)</th>
                      <th className="py-2 px-3">Teknisi</th>
                      <th className="py-2 px-3">Jenis</th>
                      <th className="py-2 px-3">Titik Lokasi Sasaran</th>
                      <th className="py-2 px-3">Jarak Aktual</th>
                      <th className="py-2 px-3">Alasan Penolakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 dark:divide-rose-950/40 text-slate-700 dark:text-slate-300">
                    {rejectedAttendances.slice(0, 10).map((rej) => (
                      <tr key={rej.id}>
                        <td className="py-2 px-3 font-mono font-semibold">{rej.localTimeWib}</td>
                        <td className="py-2 px-3 font-bold">{rej.technicianName} ({rej.technicianPhone})</td>
                        <td className="py-2 px-3 uppercase font-semibold">{rej.type}</td>
                        <td className="py-2 px-3">{rej.workLocationName}</td>
                        <td className="py-2 px-3 font-bold text-rose-600 dark:text-rose-400">
                          {rej.distanceToLocationMeters} meter
                        </td>
                        <td className="py-2 px-3 text-rose-700 dark:text-rose-300">{rej.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PENGATURAN LOKASI ABSENSI & RADIUS 300 METER */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-500" />
                  Menu Pengaturan Titik Lokasi Kerja & Radius 300 Meter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admin dapat menentukan titik lokasi kantor/proyek via peta, GPS perangkat, atau koordinat manual.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowLocationModal(true);
                  setEditingLocation(null);
                  setLocName('');
                  setLocAddress('');
                  setLocLatitude(-6.2088);
                  setLocLongitude(106.8456);
                  setLocRadius(300);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Lokasi Kerja Baru</span>
              </button>
            </div>

            {/* Interactive Map for Picking & Viewing Work Locations */}
            {settings && (
              <LeafletMap
                settings={settings}
                workLocations={workLocations}
                interactiveMode={showLocationModal}
                onMapClick={handleMapClick}
                tempMarker={
                  showLocationModal
                    ? { latitude: locLatitude, longitude: locLongitude, name: locName || 'Titik Pilihan Baru', radiusMeters: locRadius }
                    : null
                }
                height="380px"
              />
            )}

            {/* Work Locations Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-3">Nama Titik Lokasi</th>
                    <th className="py-3 px-3">Alamat</th>
                    <th className="py-3 px-3">Koordinat GPS</th>
                    <th className="py-3 px-3">Batas Radius Wajib</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {workLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>{loc.name}</span>
                      </td>
                      <td className="py-3 px-3 max-w-[250px] truncate" title={loc.address}>
                        {loc.address || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
                          {loc.radiusMeters} Meter
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            loc.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {loc.isActive ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingLocation(loc);
                              setLocName(loc.name);
                              setLocAddress(loc.address);
                              setLocLatitude(loc.latitude);
                              setLocLongitude(loc.longitude);
                              setLocRadius(loc.radiusMeters || 300);
                              setShowLocationModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                            title="Edit Titik Lokasi"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id, loc.name)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                            title="Hapus Lokasi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICIANS MANAGEMENT */}
      {activeTab === 'technicians' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Teknisi Lapangan Terdaftar</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pendaftaran hanya oleh Admin. Teknisi wajib mengganti password saat login pertama.
              </p>
            </div>
            <button
              onClick={() => {
                setShowTechModal(true);
                setTechFullName('');
                setTechPhone('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Teknisi Baru</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-3">Kode Teknisi</th>
                    <th className="py-3.5 px-3">Nama Lengkap</th>
                    <th className="py-3.5 px-3">No. HP (Username)</th>
                    <th className="py-3.5 px-3">Jabatan & Area</th>
                    <th className="py-3.5 px-3">Penugasan Lokasi</th>
                    <th className="py-3.5 px-3">Verifikasi Wajah</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {technicians.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {t.technicianId}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{t.fullName}</td>
                      <td className="py-3 px-3 font-mono">{t.phone}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold">{t.role}</div>
                        <div className="text-[11px] text-slate-400">{t.workArea}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {t.workLocationName || 'Semua Lokasi Resmi'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {t.faceEnrolled ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" /> Terdaftar
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            Belum Aktivasi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {t.status === 'active' ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTech(t);
                              setResetPasswordInput('');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                            title="Edit / Reset Password"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleTechStatus(t)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition ${
                              t.status === 'active'
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}
                          >
                            {t.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LEAVES MANAGEMENT */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Pengajuan Izin & Sakit</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Admin dapat menyetujui atau menolak izin kerja yang diajukan oleh teknisi lapangan.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-3">Nama Teknisi</th>
                    <th className="py-3.5 px-3">Jenis</th>
                    <th className="py-3.5 px-3">Periode Tanggal</th>
                    <th className="py-3.5 px-3">Alasan / Keterangan</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Tindakan Persetujuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada permohonan izin atau sakit.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{l.technicianName}</td>
                        <td className="py-3 px-3 font-bold uppercase">{l.type}</td>
                        <td className="py-3 px-3">
                          {l.startDate} s/d {l.endDate}
                        </td>
                        <td className="py-3 px-3 max-w-[250px]">
                          <div>{l.reason}</div>
                          {l.attachmentNote && (
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">
                              Lampiran: {l.attachmentNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              l.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : l.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {l.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {l.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewLeave(l.id, 'approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => handleReviewLeave(l.id, 'rejected')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Selesai Ditinjau</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: APLIKASI ANDROID & APK PANDUAN */}
      {activeTab === 'android-apk' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-sky-500" />
              Distribusi Aplikasi Android APK & PWA Online
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Panduan instalasi langsung di HP Android melalui PWA dan build file APK menggunakan Capacitor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: PWA Instant Install */}
            <div className="p-5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-sky-900 dark:text-sky-200">
                <CheckCircle className="w-4 h-4 text-sky-600" />
                <span>Metode 1: Pasang PWA di Android (Siap Pakai Sekarang)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Aplikasi sudah dilengkapi Web App Manifest, Service Worker, dan ikon HD. Teknisi dapat langsung memasang aplikasi ke layar HP tanpa perlu kompilasi:
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <li>Buka link website online di browser Google Chrome pada HP Android.</li>
                <li>Ketuk tombol <strong>Install App</strong> di bagian atas layar.</li>
                <li>Atau ketuk menu titik tiga (⋮) di Chrome &rarr; pilih <strong>Tambahkan ke Layar Utama (Add to Home screen)</strong>.</li>
                <li>Ikon aplikasi <strong>AbsenTeknisi</strong> akan muncul di beranda HP dan dapat dibuka seperti aplikasi native.</li>
              </ol>
            </div>

            {/* Box 2: Build APK Native (Capacitor) */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Metode 2: Paket APK Android (Capacitor)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Proyek ini sudah dikonfigurasi dengan <code>capacitor.config.ts</code> (App ID: <code>com.absensiteknisi.online</code>).
              </p>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
                <div className="text-slate-400"># Jalankan perintah ini di terminal:</div>
                <div>npm run build</div>
                <div>npx cap add android</div>
                <div>npx cap sync android</div>
                <div>cd android && ./gradlew assembleDebug</div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                File APK hasil build akan berlokasi di:<br />
                <code className="text-sky-600 dark:text-sky-400">android/app/build/outputs/apk/debug/app-debug.apk</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: GOOGLE SYNC */}
      {activeTab === 'google-sync' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-500" />
                Sinkronisasi Data ke Akun Google Admin
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Menyimpan otomatis seluruh data ke Google Sheets (8 sheet) dan Google Drive (Folder Foto)
              </p>
            </div>

            <button
              onClick={handleRunGoogleSync}
              disabled={syncInProgress}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 text-white text-xs font-bold shadow flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`} />
              <span>{syncInProgress ? 'Sedang Menyinkronkan...' : 'Mulai Sinkronisasi Sekarang'}</span>
            </button>
          </div>

          {/* Progress Bar */}
          {syncInProgress && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900">
              <div className="flex justify-between text-xs font-bold text-sky-800 dark:text-sky-200">
                <span>{syncStatusText}</span>
                <span>{syncPercentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-sky-200 dark:bg-sky-800 overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all duration-300"
                  style={{ width: `${syncPercentage}%` }}
                />
              </div>
            </div>
          )}

          {settings?.googleSpreadsheetId && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-2">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Google Spreadsheet Aktif Terhubung</span>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${settings.googleSpreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                <span>Buka Google Sheets di Tab Baru</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: GENERAL SETTINGS */}
      {activeTab === 'settings' && settingsForm && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500" />
                Aturan Jam Kerja & Toleransi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aturan resmi: Batas absensi masuk pukul 08:30:00 WIB (Asia/Jakarta) & radius wajib 300 meter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jam Mulai Absen Masuk
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.workStartTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workStartTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Waktu Tepat Waktu (Cutoff)
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.cutoffTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cutoffTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-sky-600 dark:text-sky-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">&le; 08:30 WIB Tepat Waktu, &gt; 08:30 WIB Terlambat</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Toleransi Keterlambatan (Menit)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settingsForm.cutoffGraceMinutes}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cutoffGraceMinutes: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
              >
                Simpan Perubahan Pengaturan
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 9: ADMIN MANAGEMENT & RBAC */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kelola Admin & Hak Akses Berjenjang</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Super Admin dapat menambahkan akun admin baru dengan peran Full Access, Admin, atau Viewer.
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddAdminModal(true);
                setNewAdminFullName('');
                setNewAdminEmail('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Admin Baru</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 px-3">Username</th>
                  <th className="py-3.5 px-3">Nama Lengkap</th>
                  <th className="py-3.5 px-3">Email Akun</th>
                  <th className="py-3.5 px-3">Nomor HP</th>
                  <th className="py-3.5 px-3">Peran (Role)</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold">{adm.username}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{adm.fullName}</td>
                    <td className="py-3 px-3">{adm.email}</td>
                    <td className="py-3 px-3 font-mono">{adm.phone || '-'}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                        {adm.role === 'superadmin' ? 'Super Admin Utama' : adm.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          adm.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {adm.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {adm.role !== 'superadmin' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleAdminStatus(adm.id, adm.status)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              adm.status === 'active'
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {adm.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(adm.id, adm.fullName)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                            title="Cabut Akses Admin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Akses Penuh</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 10: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Log Aktivitas & Audit Trail Keamanan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Setiap perubahan titik lokasi, koreksi absensi, penolakan radius, dan mutasi akun tercatat secara otomatis.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-3">Waktu (WIB)</th>
                  <th className="py-3 px-3">Aktor</th>
                  <th className="py-3 px-3">Aksi</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-3">Keterangan Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {log.actorName}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({log.actorRole})</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">{log.action}</td>
                    <td className="py-3 px-3 font-medium">{log.target}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PENGATURAN LOKASI KERJA & RADIUS 300 METER */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-500" />
                {editingLocation ? 'Perbarui Titik Lokasi Kerja' : 'Tambah Titik Lokasi Kerja & Radius 300m'}
              </h3>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setEditingLocation(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Titik Lokasi Kerja / Proyek
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="Misal: Kantor Pusat Jakarta / Site BTS Senayan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="Nama jalan atau kawasan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={locLatitude}
                    onChange={(e) => setLocLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={locLongitude}
                    onChange={(e) => setLocLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Radius Wajib (Default: 300 Meter)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    required
                    value={locRadius}
                    onChange={(e) => setLocRadius(parseInt(e.target.value, 10) || 300)}
                    className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-sky-600 dark:text-sky-400"
                  />
                  <span className="text-xs text-slate-500">Meter dari titik koordinat</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <span>Ingin gunakan titik GPS Anda saat ini?</span>
                <button
                  type="button"
                  onClick={handleCaptureAdminGPS}
                  disabled={locGpsLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold flex items-center gap-1 text-[11px]"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{locGpsLoading ? 'Mendeteksi...' : 'Ambil GPS Saya'}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
                >
                  Simpan Titik Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH ADMIN LENGKAP */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-500" />
              Formulir Tambah Admin Baru
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Admin baru dapat langsung login menggunakan akun yang telah dibuat.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Admin
                </label>
                <input
                  type="text"
                  required
                  value={newAdminFullName}
                  onChange={(e) => setNewAdminFullName(e.target.value)}
                  placeholder="Contoh: Denny Wijaya"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Akun
                </label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin.lapangan@perusahaan.co.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor HP
                </label>
                <input
                  type="tel"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  placeholder="081299887766"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Awal
                </label>
                <input
                  type="text"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peran & Hak Akses
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="full_access">Full Access (Kelola Teknisi, Lokasi & Koreksi)</option>
                  <option value="admin">Admin Operasional</option>
                  <option value="viewer">Viewer (Hanya Melihat Laporan)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  Simpan Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH TEKNISI */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-500" />
              Formulir Pendaftaran Teknisi Baru
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Nomor HP digunakan sebagai username login. Password wajib diubah saat login pertama.
            </p>

            <form onSubmit={handleCreateTechnician} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={techFullName}
                  onChange={(e) => setTechFullName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor HP Aktif (Username)
                </label>
                <input
                  type="tel"
                  required
                  value={techPhone}
                  onChange={(e) => setTechPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={techEmail}
                  onChange={(e) => setTechEmail(e.target.value)}
                  placeholder="budi@lapangan.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan / Keahlian
                </label>
                <input
                  type="text"
                  required
                  value={techRole}
                  onChange={(e) => setTechRole(e.target.value)}
                  placeholder="Teknisi Jaringan & Fiber Optic"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titik Lokasi Kerja Ditugaskan
                </label>
                <select
                  value={techWorkLocId}
                  onChange={(e) => setTechWorkLocId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="">Semua Lokasi Kerja Resmi</option>
                  {workLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password Awal Sementara
                </label>
                <input
                  type="text"
                  required
                  value={techInitialPassword}
                  onChange={(e) => setTechInitialPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
                >
                  Daftarkan Teknisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TECHNICIAN */}
      {editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Perbarui Data Teknisi {editingTech.technicianId}
            </h3>

            <form onSubmit={handleUpdateTechnician} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama</label>
                <input
                  type="text"
                  required
                  value={editingTech.fullName}
                  onChange={(e) => setEditingTech({ ...editingTech, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor HP</label>
                <input
                  type="tel"
                  required
                  value={editingTech.phone}
                  onChange={(e) => setEditingTech({ ...editingTech, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jabatan</label>
                <input
                  type="text"
                  required
                  value={editingTech.role}
                  onChange={(e) => setEditingTech({ ...editingTech, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Penugasan Lokasi Kerja
                </label>
                <select
                  value={editingTech.workLocationId || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, workLocationId: e.target.value || undefined })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="">Semua Lokasi Resmi</option>
                  {workLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password (Kosongkan bila tidak ingin mengubah)
                </label>
                <input
                  type="text"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Password baru..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTech(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL CORRECTION */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-500" />
              Koreksi Manual Absensi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Koreksi memerlukan alasan wajib dan akan dicatat secara permanen di audit trail.
            </p>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <div>Teknisi: <b>{correctionTarget.technicianName}</b></div>
                <div>Tanggal: <b>{correctionTarget.workDate}</b> ({correctionTarget.type.toUpperCase()})</div>
                <div>Waktu Asli: <b>{correctionTarget.localTimeWib}</b> ({correctionTarget.lateStatus})</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ubah Status Menjadi
                </label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="TEPAT WAKTU">TEPAT WAKTU</option>
                  <option value="TERLAMBAT">TERLAMBAT</option>
                  <option value="PULANG">PULANG</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Koreksi (Wajib Diisi)
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Misal: Teknisi tiba tepat waktu 08:15 WIB namun terkendala sinyal BTS..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCorrection}
                  disabled={!correctionReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
                >
                  Simpan Koreksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL FOTO & GPS */}
      {inspectAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-500" />
                Bukti Foto Asli & Verifikasi GPS
              </h3>
              <button
                onClick={() => setInspectAttendance(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                {inspectAttendance.photoBase64 ? (
                  <img
                    src={inspectAttendance.photoBase64}
                    alt="Foto Asli Absensi"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 text-xs">Foto tidak tersedia</div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Teknisi:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {inspectAttendance.technicianName} ({inspectAttendance.technicianCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Server WIB:</span>
                  <span className="font-mono font-bold">{inspectAttendance.localTimeWib}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Absen:</span>
                  <span className="font-bold">{inspectAttendance.lateStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Titik Lokasi Kerja:</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {inspectAttendance.workLocationName || 'Kantor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jarak Aktual:</span>
                  <span className="font-bold text-emerald-600">
                    {inspectAttendance.distanceToOfficeMeters} meter (&le; {inspectAttendance.maxAllowedRadiusMeters || 300}m)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Koordinat GPS:</span>
                  <span className="font-mono">
                    {inspectAttendance.latitude.toFixed(6)}, {inspectAttendance.longitude.toFixed(6)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps?q=${inspectAttendance.latitude},${inspectAttendance.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Buka di Google Maps</span>
                </a>
                <button
                  onClick={() => setInspectAttendance(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && settings && (
        <ExportModal
          attendances={attendances}
          settings={settings}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
