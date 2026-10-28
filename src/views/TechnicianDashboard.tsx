import React, { useEffect, useState } from 'react';
import { UserSession, AttendanceRecord, LeaveItem, AdminSettings, WorkLocation } from '../types';
import { api } from '../services/api';
import { CameraCapture } from '../components/CameraCapture';
import { reverseGeocode, calculateDistanceMeters } from '../utils/geo';
import {
  LogIn,
  LogOut,
  MapPin,
  Clock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  UserCheck,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Info,
  Navigation,
  Building2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TechnicianDashboardProps {
  user: UserSession;
  onRefreshUser: () => void;
}

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({ user, onRefreshUser }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    todayStatus: {
      hasCheckedIn: boolean;
      checkinData: AttendanceRecord | null;
      hasCheckedOut: boolean;
      checkoutData: AttendanceRecord | null;
    };
    availableLocations: WorkLocation[];
    history: AttendanceRecord[];
    leaves: LeaveItem[];
    settings: AdminSettings;
  } | null>(null);

  // Selected work location
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);

  // Calculated distance to target work location
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);
  const [maxRadius, setMaxRadius] = useState<number>(300);

  // Camera modal state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'attendance' | 'enrollment'>('attendance');
  const [attendanceType, setAttendanceType] = useState<'masuk' | 'pulang'>('masuk');
  const [submitting, setSubmitting] = useState(false);

  // Leave modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'izin' | 'sakit'>('izin');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachment, setLeaveAttachment] = useState('');

  // Notification message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getTechnicianDashboard(user.id);
      setData(res);

      // Select default work location
      if (res.availableLocations && res.availableLocations.length > 0) {
        if (!selectedLocationId) {
          const defaultLoc =
            res.availableLocations.find((l: WorkLocation) => l.id === user.workLocationId) ||
            res.availableLocations[0];
          setSelectedLocationId(defaultLoc.id);
          setMaxRadius(defaultLoc.radiusMeters || 300);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal memuat status absensi.' });
    } finally {
      setLoading(false);
    }
  };

  // Get Current GPS Location
  const requestGPS = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Perangkat tidak mendukung geolokasi GPS.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const address = await reverseGeocode(latitude, longitude);

        setGpsLocation({
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          address,
        });
        setGpsLoading(false);
      },
      (err) => {
        console.error('GPS Error:', err);
        let msg = 'Izin lokasi GPS ditolak. Silakan aktifkan izin lokasi di pengaturan browser / HP Anda.';
        if (err.code === err.TIMEOUT) msg = 'Waktu permintaan GPS habis. Coba lagi di area terbuka.';
        if (err.code === err.POSITION_UNAVAILABLE) msg = 'Informasi lokasi tidak tersedia saat ini.';
        setGpsError(msg);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  useEffect(() => {
    loadDashboard();
  }, [user.id]);

  useEffect(() => {
    requestGPS();
  }, []);

  // Update distance calculation whenever GPS or selectedLocation changes
  useEffect(() => {
    if (!gpsLocation || !data?.availableLocations) return;

    const targetLoc = data.availableLocations.find((l) => l.id === selectedLocationId) || data.availableLocations[0];
    if (targetLoc) {
      const dist = calculateDistanceMeters(
        gpsLocation.latitude,
        gpsLocation.longitude,
        targetLoc.latitude,
        targetLoc.longitude
      );
      setDistanceToTarget(dist);
      const rad = targetLoc.radiusMeters || 300;
      setMaxRadius(rad);
      setIsWithinRadius(dist <= rad);
    }
  }, [gpsLocation, selectedLocationId, data]);

  // Start Attendance Flow (With Radius Pre-Check!)
  const handleStartAttendance = (type: 'masuk' | 'pulang') => {
    setFeedback(null);

    if (!gpsLocation) {
      setFeedback({
        type: 'error',
        message: 'Lokasi GPS belum terdeteksi. Harap ketuk tombol "Perbarui Lokasi GPS" terlebih dahulu.',
      });
      return;
    }

    const currentLoc = data?.availableLocations.find((l) => l.id === selectedLocationId);
    const locName = currentLoc ? currentLoc.name : 'Lokasi Resmi';

    // Strict 300 Meter Radius Check
    if (distanceToTarget !== null && distanceToTarget > maxRadius) {
      setFeedback({
        type: 'error',
        message: `Absensi gagal. Anda berada di luar radius lokasi kerja 300 meter. Jarak Anda saat ini: ${distanceToTarget} meter dari ${locName}. Harap dekati lokasi kerja terlebih dahulu.`,
      });
      return;
    }

    setAttendanceType(type);
    setCameraMode('attendance');
    setCameraActive(true);
  };

  // Handle Photo Capture Submission
  const handlePhotoCaptured = async (photoBase64: string, livenessPassed: boolean) => {
    setCameraActive(false);

    if (cameraMode === 'enrollment') {
      try {
        setSubmitting(true);
        await api.enrollFace({
          technicianId: user.id,
          photoBase64,
          livenessPassed,
        });
        setFeedback({
          type: 'success',
          message: 'Pendaftaran dan verifikasi wajah berhasil disimpan!',
        });
        onRefreshUser();
        await loadDashboard();
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Gagal mendaftarkan wajah.' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!gpsLocation) {
      setFeedback({ type: 'error', message: 'Data GPS tidak valid saat absensi.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitAttendance({
        technicianId: user.id,
        type: attendanceType,
        photoBase64,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
        locationName: gpsLocation.address,
        targetLocationId: selectedLocationId,
        deviceTimestamp: new Date().toISOString(),
        livenessPassed,
      });

      if (res.data?.lateStatus === 'TEPAT WAKTU') {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      }

      setFeedback({
        type: 'success',
        message: res.message || 'Absensi berhasil direkam!',
      });
      await loadDashboard();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengirim absensi.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Leave
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) return;

    try {
      setSubmitting(true);
      await api.submitLeave({
        technicianId: user.id,
        type: leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason,
        attachmentNote: leaveAttachment,
      });
      setShowLeaveModal(false);
      setLeaveReason('');
      setLeaveAttachment('');
      setFeedback({
        type: 'success',
        message: 'Pengajuan izin/sakit berhasil dikirim ke admin untuk peninjauan.',
      });
      await loadDashboard();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengirim permohonan.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-semibold">Memuat data absensi teknisi...</p>
      </div>
    );
  }

  const { todayStatus, availableLocations = [], history = [], leaves = [] } = data || {
    todayStatus: { hasCheckedIn: false, checkinData: null, hasCheckedOut: false, checkoutData: null },
    availableLocations: [],
    history: [],
    leaves: [],
  };

  const selectedLocObj = availableLocations.find((l) => l.id === selectedLocationId) || availableLocations[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-start justify-between shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline ml-3">
            Tutup
          </button>
        </div>
      )}

      {/* Technician Profile Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-xl border border-sky-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {user.technicianId || 'TEKNISI'}
              </span>
              <span className="text-xs text-sky-200/80">&bull; {user.workArea || 'Wilayah Lapangan'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{user.fullName}</h1>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <span>{user.role}</span>
              <span>&bull;</span>
              <span>{user.phone}</span>
            </p>
          </div>

          <div>
            {user.faceEnrolled ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Wajah Terverifikasi</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCameraMode('enrollment');
                  setCameraActive(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold transition shadow"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Aktivasi Wajah Kamera</span>
              </button>
            )}
          </div>
        </div>

        {/* GPS Status pill */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            {gpsLoading ? (
              <span className="animate-pulse">Mendeteksi koordinat GPS presisi...</span>
            ) : gpsError ? (
              <span className="text-rose-400">{gpsError}</span>
            ) : gpsLocation ? (
              <div>
                <span className="font-semibold text-white">{gpsLocation.address.slice(0, 50)}...</span>
                <span className="text-slate-400 ml-2">(&plusmn;{gpsLocation.accuracy}m)</span>
              </div>
            ) : (
              <span>Menunggu sinyal GPS...</span>
            )}
          </div>

          <button
            onClick={requestGPS}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 hover:text-sky-200 transition underline underline-offset-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Perbarui Lokasi GPS</span>
          </button>
        </div>
      </div>

      {/* WORK LOCATION SELECTION & 300M RADIUS STATUS CARD (MANDATORY REQUIREMENT) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Titik Lokasi Kerja Resmi</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Wajib berada dalam radius maksimal 300 meter untuk dapat absen
              </p>
            </div>
          </div>

          {availableLocations.length > 1 && (
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedLocObj && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  <span>{selectedLocObj.name}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedLocObj.address || 'Alamat lokasi kerja resmi terdaftar'}
                </div>
              </div>

              {/* LIVE DISTANCE & RADIUS STATUS BADGE */}
              <div>
                {distanceToTarget !== null ? (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                      isWithinRadius
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    <Navigation className={`w-4 h-4 ${isWithinRadius ? 'text-emerald-600' : 'text-rose-600'}`} />
                    <span>
                      {isWithinRadius
                        ? `Di Dalam Radius (${distanceToTarget}m dari lokasi)`
                        : `Di Luar Radius (${distanceToTarget}m dari lokasi - Melebihi ${maxRadius}m)`}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Menghitung jarak...</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Batas Radius Wajib: <b>{maxRadius} Meter</b></span>
              <span>Koordinat Resmi: {selectedLocObj.latitude.toFixed(4)}, {selectedLocObj.longitude.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>

      {/* TODAY'S ATTENDANCE STATUS & BIG ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-in Box */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">ABSEN MASUK</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Batas Tepat Waktu: 08:30:00 WIB</p>
              </div>
            </div>

            {todayStatus.hasCheckedIn && todayStatus.checkinData && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  todayStatus.checkinData.lateStatus === 'TEPAT WAKTU'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {todayStatus.checkinData.lateStatus}
              </span>
            )}
          </div>

          {todayStatus.hasCheckedIn && todayStatus.checkinData ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Waktu Masuk:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {todayStatus.checkinData.localTimeWib}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Lokasi Masuk:</span>
                <span className="font-semibold">{todayStatus.checkinData.workLocationName || 'Kantor'}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                Jarak terverifikasi: {todayStatus.checkinData.distanceToOfficeMeters}m dari titik lokasi resmi
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleStartAttendance('masuk')}
              disabled={submitting}
              className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                isWithinRadius
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>
                {isWithinRadius
                  ? 'AMBIL FOTO & ABSEN MASUK'
                  : `DI LUAR RADIUS 300M (${distanceToTarget || 0}m)`}
              </span>
            </button>
          )}
        </div>

        {/* Check-out Box */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">ABSEN PULANG</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Wajib di lokasi kerja &le; 300m</p>
              </div>
            </div>

            {todayStatus.hasCheckedOut && todayStatus.checkoutData && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                SELESAI
              </span>
            )}
          </div>

          {todayStatus.hasCheckedOut && todayStatus.checkoutData ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Waktu Pulang:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {todayStatus.checkoutData.localTimeWib}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                Lokasi: {todayStatus.checkoutData.workLocationName} ({todayStatus.checkoutData.distanceToOfficeMeters}m)
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleStartAttendance('pulang')}
              disabled={submitting || !todayStatus.hasCheckedIn}
              className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                todayStatus.hasCheckedIn
                  ? isWithinRadius
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-lg shadow-sky-600/25'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
              }`}
            >
              <LogOut className="w-5 h-5" />
              <span>
                {todayStatus.hasCheckedIn
                  ? isWithinRadius
                    ? 'AMBIL FOTO & ABSEN PULANG'
                    : `DI LUAR RADIUS (${distanceToTarget || 0}m)`
                  : 'Lakukan Absen Masuk Dulu'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions (Izin / Sakit) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowLeaveModal(true)}
          className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Ajukan Izin / Sakit</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Pengajuan ketidakhadiran resmi</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition" />
        </button>

        <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-3">
          <Info className="w-5 h-5 text-sky-500 shrink-0" />
          <div className="text-slate-600 dark:text-slate-400">
            Sistem secara ketat mewajibkan radius maksimal 300 meter untuk mencegah kecurangan kehadiran.
          </div>
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-500" />
              Riwayat Absensi Pribadi Anda
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Data tersimpan online dan terisolasi khusus untuk akun Anda
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada catatan absensi yang terekam.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Jenis</th>
                  <th className="py-3 px-3">Jam WIB</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Titik Lokasi</th>
                  <th className="py-3 px-3">Jarak</th>
                  <th className="py-3 px-3">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {history.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold">{att.workDate}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[11px] uppercase tracking-wide">
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
                    <td className="py-3 px-3 max-w-[180px] truncate" title={att.workLocationName || att.locationName}>
                      {att.workLocationName || att.locationName}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {att.distanceToOfficeMeters}m
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {att.livenessPassed ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lulus
                        </span>
                      ) : (
                        <span className="text-slate-400">Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Leaves History */}
      {leaves.length > 0 && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-500" />
            Riwayat Pengajuan Izin & Sakit Anda
          </h3>
          <div className="space-y-2">
            {leaves.map((l) => (
              <div
                key={l.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {l.type.toUpperCase()} ({l.startDate} s/d {l.endDate})
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">{l.reason}</div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    l.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : l.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {l.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {cameraActive && (
        <CameraCapture
          mode={cameraMode}
          attendanceType={attendanceType}
          requireLiveness={true}
          onCapture={handlePhotoCaptured}
          onCancel={() => setCameraActive(false)}
        />
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-500" />
              Formulir Pengajuan Izin / Sakit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Pengajuan akan langsung masuk ke dashboard admin untuk diverifikasi
            </p>

            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Pengajuan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('izin')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      leaveType === 'izin'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Izin Kerja
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('sakit')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      leaveType === 'sakit'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Sakit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Lengkap
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Jelaskan alasan izin / sakit..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Surat Dokter / Lampiran
                </label>
                <input
                  type="text"
                  value={leaveAttachment}
                  onChange={(e) => setLeaveAttachment(e.target.value)}
                  placeholder="Misal: Surat dokter terlampir di WhatsApp"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 shadow"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
