import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Data storage directory
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'absensi-store.json');

// Password hashing helper
function hashPassword(password: string, salt: string = 'absensi_salt_2026'): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Database Structure
interface DatabaseSchema {
  admins: Array<{
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: 'superadmin' | 'full_access' | 'admin' | 'viewer';
    status: 'active' | 'disabled';
    mustChangePassword: boolean;
    createdAt: string;
  }>;
  technicians: Array<{
    id: string;
    technicianId: string;
    fullName: string;
    phone: string;
    email: string;
    role: string;
    workArea: string;
    workLocationId?: string;
    workLocationName?: string;
    passwordHash: string;
    status: 'active' | 'inactive';
    mustChangePassword: boolean;
    photoProfile?: string;
    faceEnrolled: boolean;
    faceEnrolledAt?: string;
    facePhotoUrl?: string;
    createdAt: string;
  }>;
  workLocations: Array<{
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number; // default 300
    assignedTechIds: string[]; // empty means all technicians
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
  }>;
  rejectedAttendances: Array<{
    id: string;
    technicianId: string;
    technicianCode: string;
    technicianName: string;
    technicianPhone: string;
    attemptedAt: string;
    localTimeWib: string;
    type: 'masuk' | 'pulang';
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceToLocationMeters: number;
    maxAllowedRadiusMeters: number;
    workLocationName: string;
    reason: string;
  }>;
  attendances: Array<{
    id: string;
    attendanceCode: string;
    technicianId: string;
    technicianCode: string;
    technicianName: string;
    technicianPhone: string;
    workDate: string; // YYYY-MM-DD
    type: 'masuk' | 'pulang';
    serverTimestamp: string;
    localTimeWib: string;
    deviceTimestamp: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
    workLocationId?: string;
    workLocationName: string;
    distanceToOfficeMeters: number;
    maxAllowedRadiusMeters: number;
    isWithinRadius: boolean;
    photoBase64: string;
    photoDriveUrl?: string;
    livenessPassed: boolean;
    faceVerified: boolean;
    lateStatus: 'TEPAT WAKTU' | 'TERLAMBAT' | 'PULANG';
    minutesLate: number;
    notes?: string;
    correctionId?: string;
    correctionReason?: string;
    correctedBy?: string;
    correctedAt?: string;
  }>;
  leaves: Array<{
    id: string;
    technicianId: string;
    technicianName: string;
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentNote?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
    createdAt: string;
  }>;
  correctionRequests: Array<{
    id: string;
    technicianId: string;
    technicianName: string;
    attendanceDate: string;
    type: 'masuk' | 'pulang';
    proposedTime: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reviewNote?: string;
  }>;
  settings: {
    workStartTime: string;
    workEndTime: string;
    cutoffTime: string; // '08:30:00'
    cutoffGraceMinutes: number;
    timezone: string;
    defaultRadiusMeters: number; // 300
    enforceRadius300m: boolean; // true
    officeName: string;
    officeLatitude: number;
    officeLongitude: number;
    officeRadiusMeters: number;
    enforceGeofence: boolean;
    maxGpsAccuracyMeters: number;
    requireLiveness: boolean;
    googleSpreadsheetId?: string;
    googleDriveFolderId?: string;
    lastGoogleSync?: string;
  };
  auditLogs: Array<{
    id: string;
    timestamp: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    target: string;
    details: string;
    ip?: string;
  }>;
}

const DEFAULT_DB: DatabaseSchema = {
  admins: [
    {
      id: 'admin-super-01',
      username: 'admin',
      fullName: 'Administrator Utama',
      email: 'admin@perusahaan.co.id',
      phone: '081100002026',
      passwordHash: hashPassword('admin2026'),
      role: 'superadmin',
      status: 'active',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    },
  ],
  technicians: [
    {
      id: 'tek-seed-01',
      technicianId: 'TEK-2026-001',
      fullName: 'Budi Santoso',
      phone: '081234567890',
      email: 'budi.santoso@lapangan.id',
      role: 'Teknisi Jaringan & Fiber Optic',
      workArea: 'Area Jakarta Pusat',
      workLocationId: 'loc-01',
      workLocationName: 'Kantor Pusat & Workshop Jakarta',
      passwordHash: hashPassword('teknisi123'),
      status: 'active',
      mustChangePassword: false,
      faceEnrolled: true,
      faceEnrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tek-seed-02',
      technicianId: 'TEK-2026-002',
      fullName: 'Ahmad Fauzi',
      phone: '081398765432',
      email: 'ahmad.fauzi@lapangan.id',
      role: 'Teknisi Hardware & CCTV',
      workArea: 'Area Jakarta Selatan',
      workLocationId: 'loc-02',
      workLocationName: 'Site Proyek Tower Sudirman',
      passwordHash: hashPassword('teknisi123'),
      status: 'active',
      mustChangePassword: false,
      faceEnrolled: true,
      faceEnrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tek-seed-03',
      technicianId: 'TEK-2026-003',
      fullName: 'Rian Pratama',
      phone: '085712348899',
      email: 'rian.pratama@lapangan.id',
      role: 'Teknisi Listrik & UPS',
      workArea: 'Area Jakarta Barat',
      workLocationId: 'loc-01',
      workLocationName: 'Kantor Pusat & Workshop Jakarta',
      passwordHash: hashPassword('teknisi123'),
      status: 'active',
      mustChangePassword: true,
      faceEnrolled: false,
      createdAt: new Date().toISOString(),
    },
  ],
  workLocations: [
    {
      id: 'loc-01',
      name: 'Kantor Pusat & Workshop Jakarta',
      address: 'Jl. M.H. Thamrin No. 1, Menteng, Jakarta Pusat',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 300, // 300 Meter Wajib
      assignedTechIds: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'loc-02',
      name: 'Site Proyek Tower Sudirman',
      address: 'Kawasan SCBD Sudirman, Senayan, Jakarta Selatan',
      latitude: -6.2215,
      longitude: 106.8185,
      radiusMeters: 300, // 300 Meter Wajib
      assignedTechIds: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'loc-03',
      name: 'Gudang Lapangan & Hub Barat',
      address: 'Jl. Daan Mogot KM 12, Cengkareng, Jakarta Barat',
      latitude: -6.1552,
      longitude: 106.7328,
      radiusMeters: 300, // 300 Meter Wajib
      assignedTechIds: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  rejectedAttendances: [],
  attendances: [],
  leaves: [],
  correctionRequests: [],
  settings: {
    workStartTime: '08:00:00',
    workEndTime: '17:00:00',
    cutoffTime: '08:30:00',
    cutoffGraceMinutes: 0,
    timezone: 'Asia/Jakarta',
    defaultRadiusMeters: 300,
    enforceRadius300m: true,
    officeName: 'Kantor Pusat & Workshop Lapangan Jakarta',
    officeLatitude: -6.2088,
    officeLongitude: 106.8456,
    officeRadiusMeters: 300,
    enforceGeofence: true,
    maxGpsAccuracyMeters: 100,
    requireLiveness: true,
  },
  auditLogs: [
    {
      id: 'log-init-01',
      timestamp: new Date().toISOString(),
      actorId: 'system',
      actorName: 'System Setup',
      actorRole: 'system',
      action: 'SYSTEM_INITIALIZATION',
      target: 'Database Online',
      details: 'Inisialisasi sistem absensi online dengan batas jam 08:30 WIB dan radius wajib 300 meter.',
    },
  ],
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      ...DEFAULT_DB,
      ...data,
      workLocations: data.workLocations && data.workLocations.length > 0 ? data.workLocations : DEFAULT_DB.workLocations,
      rejectedAttendances: data.rejectedAttendances || [],
    };
  } catch (err) {
    console.error('Error reading DB file, using fallback:', err);
    return DEFAULT_DB;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

function addAuditLog(
  db: DatabaseSchema,
  actorId: string,
  actorName: string,
  actorRole: string,
  action: string,
  target: string,
  details: string
) {
  const log = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    actorId,
    actorName,
    actorRole,
    action,
    target,
    details,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
}

function getServerWIBTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const yyyy = partMap.year;
  const mm = partMap.month;
  const dd = partMap.day;
  const hh = partMap.hour;
  const min = partMap.minute;
  const ss = partMap.second;

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}:${ss}`;
  const totalSeconds = parseInt(hh, 10) * 3600 + parseInt(min, 10) * 60 + parseInt(ss, 10);
  const cutoffSeconds = 8 * 3600 + 30 * 60; // 08:30:00 WIB
  const isLate = totalSeconds > cutoffSeconds;
  const minutesLate = isLate ? Math.floor((totalSeconds - cutoffSeconds) / 60) : 0;

  return {
    iso: now.toISOString(),
    dateStr,
    timeStr,
    localFormatted: `${timeStr} WIB`,
    year: parseInt(yyyy, 10),
    month: parseInt(mm, 10),
    day: parseInt(dd, 10),
    hour: parseInt(hh, 10),
    minute: parseInt(min, 10),
    second: parseInt(ss, 10),
    totalSeconds,
    cutoffSeconds,
    isLate,
    minutesLate,
    timezone: 'Asia/Jakarta (WIB)',
  };
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Get Official Server Time (WIB)
app.get('/api/time', (req, res) => {
  const wib = getServerWIBTime();
  res.json({
    status: 'success',
    data: wib,
  });
});

// 2. Authentication Login (Admin & Technician)
app.post('/api/auth/login', (req, res) => {
  const { username, password, loginType } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username / Nomor HP dan kata sandi wajib diisi.' });
  }

  const db = readDb();
  const trimmed = username.trim();

  // Try Admin
  if (loginType === 'admin' || !loginType) {
    const admin = db.admins.find(
      (a) =>
        a.username.toLowerCase() === trimmed.toLowerCase() ||
        a.email.toLowerCase() === trimmed.toLowerCase() ||
        (a.phone && a.phone.trim() === trimmed)
    );

    if (admin) {
      if (admin.status === 'disabled') {
        return res.status(403).json({ status: 'error', message: 'Akun admin telah dinonaktifkan oleh Administrator Utama.' });
      }

      const inputHash = hashPassword(password);
      if (inputHash === admin.passwordHash) {
        addAuditLog(db, admin.id, admin.fullName, admin.role, 'LOGIN_SUCCESS', 'Admin Auth', 'Admin berhasil login ke dashboard');
        writeDb(db);

        const token = 'sess_' + admin.id + '_' + Date.now();
        return res.json({
          status: 'success',
          token,
          user: {
            id: admin.id,
            username: admin.username,
            fullName: admin.fullName,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            type: 'admin',
            mustChangePassword: admin.mustChangePassword,
          },
        });
      }
    }
  }

  // Try Technician
  if (loginType === 'technician' || !loginType) {
    const tech = db.technicians.find(
      (t) =>
        t.phone.trim() === trimmed ||
        t.email.toLowerCase() === trimmed.toLowerCase() ||
        t.technicianId.toLowerCase() === trimmed.toLowerCase()
    );

    if (tech) {
      if (tech.status === 'inactive') {
        return res.status(403).json({ status: 'error', message: 'Akun teknisi Anda dinonaktifkan. Hubungi admin operasional.' });
      }

      const inputHash = hashPassword(password);
      if (inputHash === tech.passwordHash) {
        addAuditLog(db, tech.id, tech.fullName, 'technician', 'LOGIN_SUCCESS', 'Technician Auth', 'Teknisi berhasil login ke portal absensi');
        writeDb(db);

        const token = 'sess_' + tech.id + '_' + Date.now();
        return res.json({
          status: 'success',
          token,
          user: {
            id: tech.id,
            technicianId: tech.technicianId,
            fullName: tech.fullName,
            phone: tech.phone,
            email: tech.email,
            role: tech.role,
            workArea: tech.workArea,
            workLocationId: tech.workLocationId,
            workLocationName: tech.workLocationName,
            type: 'technician',
            faceEnrolled: tech.faceEnrolled,
            mustChangePassword: tech.mustChangePassword,
          },
        });
      }
    }
  }

  return res.status(401).json({ status: 'error', message: 'Kredensial tidak sesuai. Periksa kembali Username/Nomor HP dan Kata Sandi.' });
});

// 3. Change Password
app.post('/api/auth/change-password', (req, res) => {
  const { userId, oldPassword, newPassword, userType } = req.body;
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Kata sandi baru minimal 6 karakter.' });
  }

  const db = readDb();
  if (userType === 'admin') {
    const admin = db.admins.find((a) => a.id === userId);
    if (!admin) return res.status(404).json({ status: 'error', message: 'Akun admin tidak ditemukan.' });

    if (oldPassword && hashPassword(oldPassword) !== admin.passwordHash && !admin.mustChangePassword) {
      return res.status(400).json({ status: 'error', message: 'Kata sandi lama tidak sesuai.' });
    }

    admin.passwordHash = hashPassword(newPassword);
    admin.mustChangePassword = false;
    addAuditLog(db, admin.id, admin.fullName, admin.role, 'PASSWORD_CHANGE', 'Admin Auth', 'Admin berhasil memperbarui kata sandi akun');
    writeDb(db);
    return res.json({ status: 'success', message: 'Kata sandi berhasil diperbarui.' });
  } else {
    const tech = db.technicians.find((t) => t.id === userId);
    if (!tech) return res.status(404).json({ status: 'error', message: 'Akun teknisi tidak ditemukan.' });

    if (oldPassword && hashPassword(oldPassword) !== tech.passwordHash && !tech.mustChangePassword) {
      return res.status(400).json({ status: 'error', message: 'Kata sandi lama tidak sesuai.' });
    }

    tech.passwordHash = hashPassword(newPassword);
    tech.mustChangePassword = false;
    addAuditLog(db, tech.id, tech.fullName, 'technician', 'PASSWORD_CHANGE', 'Technician Auth', 'Teknisi berhasil memperbarui kata sandi');
    writeDb(db);
    return res.json({ status: 'success', message: 'Kata sandi berhasil diperbarui.' });
  }
});

// 4. Admin Forgot Password / Emergency Recovery
app.post('/api/auth/recover-admin', (req, res) => {
  const { recoveryCode, newPassword } = req.body;
  if (recoveryCode !== 'RECOVER-ADMIN-2026') {
    return res.status(400).json({ status: 'error', message: 'Kode pemulihan tidak valid.' });
  }

  const db = readDb();
  const superAdmin = db.admins.find((a) => a.role === 'superadmin') || db.admins[0];
  if (!superAdmin) return res.status(404).json({ status: 'error', message: 'Akun superadmin tidak ditemukan.' });

  superAdmin.passwordHash = hashPassword(newPassword || 'admin2026');
  superAdmin.mustChangePassword = true;
  addAuditLog(db, 'system', 'Disaster Recovery', 'system', 'ADMIN_PASSWORD_RECOVERY', 'Admin Auth', 'Kata sandi superadmin direset via kode pemulihan');
  writeDb(db);

  return res.json({ status: 'success', message: 'Kata sandi admin berhasil direset. Silakan login kembali.' });
});

// 5. Admin Dashboard Overview Stats
app.get('/api/admin/overview', (req, res) => {
  const db = readDb();
  const wib = getServerWIBTime();
  const todayDate = wib.dateStr;

  const totalTechnicians = db.technicians.length;
  const activeTechnicians = db.technicians.filter((t) => t.status === 'active').length;

  const todayAttendances = db.attendances.filter((a) => a.workDate === todayDate && a.type === 'masuk');
  const todayCheckouts = db.attendances.filter((a) => a.workDate === todayDate && a.type === 'pulang');

  const onTimeCount = todayAttendances.filter((a) => a.lateStatus === 'TEPAT WAKTU').length;
  const lateCount = todayAttendances.filter((a) => a.lateStatus === 'TERLAMBAT').length;

  const activeLeaves = db.leaves.filter((l) => l.status === 'approved' && l.startDate <= todayDate && l.endDate >= todayDate);
  const leaveCount = activeLeaves.length;

  const attendedTechIds = new Set(todayAttendances.map((a) => a.technicianId));
  const leaveTechIds = new Set(activeLeaves.map((l) => l.technicianId));
  const notPresentCount = Math.max(0, activeTechnicians - attendedTechIds.size - leaveTechIds.size);

  const tardinessRate = todayAttendances.length > 0 ? Math.round((lateCount / todayAttendances.length) * 100) : 0;

  // Total rejected attendances due to radius
  const rejectedRadiusCount = db.rejectedAttendances ? db.rejectedAttendances.length : 0;

  const recentAttendances = [...db.attendances]
    .sort((a, b) => new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime())
    .slice(0, 10);

  res.json({
    status: 'success',
    data: {
      serverTime: wib,
      stats: {
        totalTechnicians,
        activeTechnicians,
        presentToday: todayAttendances.length,
        onTimeCount,
        lateCount,
        leaveCount,
        notPresentCount,
        tardinessRate,
        checkoutToday: todayCheckouts.length,
        rejectedRadiusCount,
        activeLocationsCount: db.workLocations.filter((l) => l.isActive).length,
      },
      workLocations: db.workLocations,
      recentAttendances,
      settings: db.settings,
    },
  });
});

// 6. Work Locations Management (PENGATURAN LOKASI ABSENSI & RADIUS 300 METER)
app.get('/api/admin/work-locations', (req, res) => {
  const db = readDb();
  res.json({ status: 'success', data: db.workLocations });
});

app.post('/api/admin/work-locations', (req, res) => {
  const { name, address, latitude, longitude, radiusMeters, assignedTechIds, adminActorId, adminActorName } = req.body;
  if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ status: 'error', message: 'Nama lokasi serta koordinat Latitude dan Longitude wajib diisi.' });
  }

  const db = readDb();
  const radius = typeof radiusMeters === 'number' && radiusMeters > 0 ? radiusMeters : 300; // default 300 meter

  const newLocation = {
    id: 'loc-' + Date.now(),
    name: name.trim(),
    address: (address || '').trim(),
    latitude,
    longitude,
    radiusMeters: radius,
    assignedTechIds: Array.isArray(assignedTechIds) ? assignedTechIds : [],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.workLocations.push(newLocation);
  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'CREATE_WORK_LOCATION',
    `Lokasi Kerja: ${newLocation.name}`,
    `Menambahkan lokasi kerja baru (${newLocation.latitude}, ${newLocation.longitude}) dengan radius wajib ${radius} meter.`
  );
  writeDb(db);

  res.json({ status: 'success', message: `Lokasi "${newLocation.name}" dengan radius ${radius}m berhasil disimpan!`, data: newLocation });
});

app.put('/api/admin/work-locations/:id', (req, res) => {
  const { id } = req.params;
  const { name, address, latitude, longitude, radiusMeters, assignedTechIds, isActive, adminActorId, adminActorName } = req.body;

  const db = readDb();
  const loc = db.workLocations.find((l) => l.id === id);
  if (!loc) return res.status(404).json({ status: 'error', message: 'Titik lokasi kerja tidak ditemukan.' });

  if (name) loc.name = name.trim();
  if (address !== undefined) loc.address = address.trim();
  if (typeof latitude === 'number') loc.latitude = latitude;
  if (typeof longitude === 'number') loc.longitude = longitude;
  if (typeof radiusMeters === 'number' && radiusMeters > 0) loc.radiusMeters = radiusMeters;
  if (Array.isArray(assignedTechIds)) loc.assignedTechIds = assignedTechIds;
  if (typeof isActive === 'boolean') loc.isActive = isActive;
  loc.updatedAt = new Date().toISOString();

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'UPDATE_WORK_LOCATION',
    `Lokasi Kerja: ${loc.name}`,
    `Memperbarui titik lokasi (${loc.latitude}, ${loc.longitude}) dengan radius ${loc.radiusMeters} meter.`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Data lokasi kerja berhasil diperbarui.', data: loc });
});

app.delete('/api/admin/work-locations/:id', (req, res) => {
  const { id } = req.params;
  const { adminActorId, adminActorName } = req.query;

  const db = readDb();
  const idx = db.workLocations.findIndex((l) => l.id === id);
  if (idx === -1) return res.status(404).json({ status: 'error', message: 'Titik lokasi tidak ditemukan.' });

  const deleted = db.workLocations[idx];
  db.workLocations.splice(idx, 1);

  addAuditLog(
    db,
    (adminActorId as string) || 'admin',
    (adminActorName as string) || 'Admin',
    'admin',
    'DELETE_WORK_LOCATION',
    `Lokasi: ${deleted.name}`,
    `Menghapus titik lokasi kerja ${deleted.name}`
  );
  writeDb(db);

  res.json({ status: 'success', message: `Lokasi "${deleted.name}" berhasil dihapus.` });
});

// 7. Rejected Attendances Log (Radius Exceeded)
app.get('/api/admin/rejected-attendances', (req, res) => {
  const db = readDb();
  res.json({ status: 'success', data: db.rejectedAttendances || [] });
});

// 8. Technicians Management
app.get('/api/admin/technicians', (req, res) => {
  const db = readDb();
  res.json({ status: 'success', data: db.technicians });
});

app.post('/api/admin/technicians', (req, res) => {
  const { fullName, phone, email, role, workArea, workLocationId, initialPassword, adminActorId, adminActorName } = req.body;
  if (!fullName || !phone || !email || !role || !initialPassword) {
    return res.status(400).json({ status: 'error', message: 'Semua kolom formulir pendaftaran teknisi wajib diisi.' });
  }

  const db = readDb();
  const cleanPhone = phone.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (db.technicians.some((t) => t.phone === cleanPhone)) {
    return res.status(400).json({ status: 'error', message: 'Nomor HP sudah terdaftar untuk teknisi lain.' });
  }
  if (db.technicians.some((t) => t.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ status: 'error', message: 'Email sudah terdaftar untuk teknisi lain.' });
  }

  const currentCount = db.technicians.length + 1;
  const year = new Date().getFullYear();
  const techCode = `TEK-${year}-${String(currentCount).padStart(3, '0')}`;

  const assignedLoc = db.workLocations.find((l) => l.id === workLocationId);

  const newTech = {
    id: 'tek-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    technicianId: techCode,
    fullName: fullName.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    role: role.trim(),
    workArea: (workArea || 'Wilayah Operasional Lapangan').trim(),
    workLocationId: workLocationId || undefined,
    workLocationName: assignedLoc ? assignedLoc.name : 'Semua Lokasi Resmi',
    passwordHash: hashPassword(initialPassword),
    status: 'active' as const,
    mustChangePassword: true,
    faceEnrolled: false,
    createdAt: new Date().toISOString(),
  };

  db.technicians.push(newTech);
  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'CREATE_TECHNICIAN',
    `Teknisi ${techCode}`,
    `Mendaftarkan teknisi baru ${fullName} (${cleanPhone}) dengan lokasi: ${newTech.workLocationName}`
  );
  writeDb(db);

  res.json({
    status: 'success',
    message: `Teknisi ${fullName} berhasil didaftarkan dengan ID ${techCode}`,
    data: newTech,
  });
});

app.put('/api/admin/technicians/:id', (req, res) => {
  const { id } = req.params;
  const { fullName, phone, email, role, workArea, workLocationId, status, resetPassword, adminActorId, adminActorName } = req.body;

  const db = readDb();
  const tech = db.technicians.find((t) => t.id === id);
  if (!tech) return res.status(404).json({ status: 'error', message: 'Teknisi tidak ditemukan.' });

  if (fullName) tech.fullName = fullName.trim();
  if (phone) tech.phone = phone.trim();
  if (email) tech.email = email.trim().toLowerCase();
  if (role) tech.role = role.trim();
  if (workArea) tech.workArea = workArea.trim();
  if (workLocationId !== undefined) {
    tech.workLocationId = workLocationId || undefined;
    const assignedLoc = db.workLocations.find((l) => l.id === workLocationId);
    tech.workLocationName = assignedLoc ? assignedLoc.name : 'Semua Lokasi Resmi';
  }
  if (status) tech.status = status;

  if (resetPassword) {
    tech.passwordHash = hashPassword(resetPassword);
    tech.mustChangePassword = true;
  }

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'UPDATE_TECHNICIAN',
    `Teknisi ${tech.technicianId}`,
    `Memperbarui data teknisi ${tech.fullName} (Status: ${tech.status})`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Data teknisi berhasil diperbarui.' });
});

// 9. Admin Accounts & Access Control (MANAJEMEN ADMIN LENGKAP DENGAN HAK AKSES)
app.get('/api/admin/admins', (req, res) => {
  const db = readDb();
  const list = db.admins.map((a) => ({
    id: a.id,
    username: a.username,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    role: a.role,
    status: a.status,
    createdAt: a.createdAt,
  }));
  res.json({ status: 'success', data: list });
});

app.post('/api/admin/admins', (req, res) => {
  const { fullName, email, phone, initialPassword, role, adminActorId, adminActorName } = req.body;
  if (!fullName || !email || !initialPassword) {
    return res.status(400).json({ status: 'error', message: 'Nama lengkap, email, dan kata sandi awal wajib diisi.' });
  }

  const db = readDb();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone ? phone.trim() : '';

  if (db.admins.some((a) => a.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ status: 'error', message: 'Email admin ini sudah terdaftar di sistem.' });
  }

  const assignedRole = role === 'full_access' || role === 'admin' || role === 'viewer' ? role : 'full_access';
  const username = cleanEmail.split('@')[0] + Math.floor(Math.random() * 90 + 10);

  const newAdmin = {
    id: 'admin-' + Date.now(),
    username,
    fullName: fullName.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    passwordHash: hashPassword(initialPassword),
    role: assignedRole as 'full_access' | 'admin' | 'viewer',
    status: 'active' as const,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };

  db.admins.push(newAdmin);
  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Super Admin',
    'superadmin',
    'ADD_NEW_ADMIN',
    `Admin ${cleanEmail}`,
    `Menambahkan admin baru ${fullName} dengan peran: ${assignedRole} dan hak akses aktif.`
  );
  writeDb(db);

  res.json({
    status: 'success',
    message: `Admin ${fullName} (${cleanEmail}) berhasil dibuat dengan peran ${assignedRole}! Akun dapat langsung digunakan login.`,
    data: newAdmin,
  });
});

app.put('/api/admin/admins/:id', (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, role, status, resetPassword, adminActorId, adminActorName } = req.body;

  const db = readDb();
  const targetAdmin = db.admins.find((a) => a.id === id);
  if (!targetAdmin) return res.status(404).json({ status: 'error', message: 'Admin tidak ditemukan.' });

  if (fullName) targetAdmin.fullName = fullName.trim();
  if (email) targetAdmin.email = email.trim().toLowerCase();
  if (phone !== undefined) targetAdmin.phone = phone.trim();
  if (role && targetAdmin.role !== 'superadmin') targetAdmin.role = role;
  if (status && targetAdmin.role !== 'superadmin') targetAdmin.status = status;

  if (resetPassword) {
    targetAdmin.passwordHash = hashPassword(resetPassword);
    targetAdmin.mustChangePassword = true;
  }

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'superadmin',
    'UPDATE_ADMIN',
    `Admin ${targetAdmin.email}`,
    `Memperbarui profil/status admin (${targetAdmin.role}, ${targetAdmin.status})`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Data admin berhasil diperbarui.' });
});

app.delete('/api/admin/admins/:id', (req, res) => {
  const { id } = req.params;
  const { adminActorId, adminActorName } = req.query;

  const db = readDb();
  const targetAdmin = db.admins.find((a) => a.id === id);
  if (!targetAdmin) return res.status(404).json({ status: 'error', message: 'Admin tidak ditemukan.' });

  if (targetAdmin.role === 'superadmin') {
    return res.status(400).json({ status: 'error', message: 'Akun Super Admin Utama tidak dapat dihapus.' });
  }

  const idx = db.admins.findIndex((a) => a.id === id);
  db.admins.splice(idx, 1);

  addAuditLog(
    db,
    (adminActorId as string) || 'admin',
    (adminActorName as string) || 'Super Admin',
    'superadmin',
    'DELETE_ADMIN',
    `Admin ${targetAdmin.email}`,
    `Mencabut seluruh akses dan menghapus admin ${targetAdmin.fullName} (${targetAdmin.email})`
  );
  writeDb(db);

  res.json({ status: 'success', message: `Akses admin ${targetAdmin.fullName} berhasil dicabut.` });
});

// 10. Technician Dashboard & Attendance Submission (STRICT RADIUS 300 METER)
app.get('/api/technician/dashboard/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const tech = db.technicians.find((t) => t.id === id);
  if (!tech) return res.status(404).json({ status: 'error', message: 'Teknisi tidak ditemukan.' });

  const wib = getServerWIBTime();
  const todayDate = wib.dateStr;

  const todayCheckin = db.attendances.find((a) => a.technicianId === id && a.workDate === todayDate && a.type === 'masuk');
  const todayCheckout = db.attendances.find((a) => a.technicianId === id && a.workDate === todayDate && a.type === 'pulang');

  const history = db.attendances
    .filter((a) => a.technicianId === id)
    .sort((a, b) => new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime())
    .slice(0, 30);

  const leaves = db.leaves
    .filter((l) => l.technicianId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Find applicable locations for this technician
  const availableLocations = db.workLocations.filter((l) => {
    if (!l.isActive) return false;
    if (tech.workLocationId) return l.id === tech.workLocationId;
    if (l.assignedTechIds.length === 0) return true;
    return l.assignedTechIds.includes(tech.id);
  });

  res.json({
    status: 'success',
    data: {
      serverTime: wib,
      technician: {
        id: tech.id,
        technicianId: tech.technicianId,
        fullName: tech.fullName,
        phone: tech.phone,
        email: tech.email,
        role: tech.role,
        workArea: tech.workArea,
        workLocationId: tech.workLocationId,
        workLocationName: tech.workLocationName,
        faceEnrolled: tech.faceEnrolled,
      },
      availableLocations,
      todayStatus: {
        hasCheckedIn: !!todayCheckin,
        checkinData: todayCheckin || null,
        hasCheckedOut: !!todayCheckout,
        checkoutData: todayCheckout || null,
      },
      history,
      leaves,
      settings: db.settings,
    },
  });
});

// Submit Attendance with STRICT 300m Radius Validation
app.post('/api/technician/attendance', (req, res) => {
  const {
    technicianId,
    type,
    photoBase64,
    latitude,
    longitude,
    accuracy,
    locationName,
    targetLocationId,
    deviceTimestamp,
    livenessPassed,
  } = req.body;

  if (!technicianId || !type || !photoBase64 || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      status: 'error',
      message: 'Data absensi tidak lengkap. Kamera dan lokasi GPS wajib aktif.',
    });
  }

  const db = readDb();
  const tech = db.technicians.find((t) => t.id === technicianId);
  if (!tech) return res.status(404).json({ status: 'error', message: 'Data teknisi tidak valid.' });

  if (tech.status === 'inactive') {
    return res.status(403).json({ status: 'error', message: 'Akun Anda dinonaktifkan oleh administrator.' });
  }

  const serverWIB = getServerWIBTime();
  const workDate = serverWIB.dateStr;

  // Duplicate Check-in Prevention
  if (type === 'masuk') {
    const existingCheckin = db.attendances.find((a) => a.technicianId === technicianId && a.workDate === workDate && a.type === 'masuk');
    if (existingCheckin) {
      return res.status(400).json({
        status: 'error',
        message: `Anda sudah melakukan Absen Masuk hari ini pada pukul ${existingCheckin.localTimeWib}.`,
      });
    }
  } else if (type === 'pulang') {
    const existingCheckin = db.attendances.find((a) => a.technicianId === technicianId && a.workDate === workDate && a.type === 'masuk');
    if (!existingCheckin) {
      return res.status(400).json({
        status: 'error',
        message: 'Anda belum melakukan Absen Masuk hari ini.',
      });
    }

    const existingCheckout = db.attendances.find((a) => a.technicianId === technicianId && a.workDate === workDate && a.type === 'pulang');
    if (existingCheckout) {
      return res.status(400).json({
        status: 'error',
        message: `Anda sudah melakukan Absen Pulang hari ini pada pukul ${existingCheckout.localTimeWib}.`,
      });
    }
  }

  // Find Nearest or Assigned Work Location
  let targetLocation = null;
  if (targetLocationId) {
    targetLocation = db.workLocations.find((l) => l.id === targetLocationId && l.isActive);
  }
  if (!targetLocation && tech.workLocationId) {
    targetLocation = db.workLocations.find((l) => l.id === tech.workLocationId && l.isActive);
  }

  // If no specific assigned location, find nearest active location
  if (!targetLocation) {
    let minDistance = Infinity;
    db.workLocations.filter((l) => l.isActive).forEach((loc) => {
      const dist = calculateDistanceMeters(latitude, longitude, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        targetLocation = loc;
      }
    });
  }

  // Fallback to default office settings if no work locations exist
  const officeName = targetLocation ? targetLocation.name : db.settings.officeName;
  const officeLat = targetLocation ? targetLocation.latitude : db.settings.officeLatitude;
  const officeLng = targetLocation ? targetLocation.longitude : db.settings.officeLongitude;
  const maxAllowedRadius = targetLocation ? targetLocation.radiusMeters : db.settings.defaultRadiusMeters || 300;

  const distanceMeters = calculateDistanceMeters(latitude, longitude, officeLat, officeLng);

  // STRICT 300 METER RADIUS VALIDATION (WAJIB 300 METER)
  if (distanceMeters > maxAllowedRadius) {
    // Record rejection in database for audit and dashboard statistic
    const rejectionRecord = {
      id: 'rej-' + Date.now(),
      technicianId: tech.id,
      technicianCode: tech.technicianId,
      technicianName: tech.fullName,
      technicianPhone: tech.phone,
      attemptedAt: serverWIB.iso,
      localTimeWib: serverWIB.localFormatted,
      type: type as 'masuk' | 'pulang',
      latitude,
      longitude,
      accuracy: Math.round(accuracy || 10),
      distanceToLocationMeters: distanceMeters,
      maxAllowedRadiusMeters: maxAllowedRadius,
      workLocationName: officeName,
      reason: `Di luar radius lokasi kerja (Jarak: ${distanceMeters} meter, Batas Maks: ${maxAllowedRadius} meter)`,
    };

    if (!db.rejectedAttendances) db.rejectedAttendances = [];
    db.rejectedAttendances.unshift(rejectionRecord);

    addAuditLog(
      db,
      tech.id,
      tech.fullName,
      'technician',
      'ATTENDANCE_REJECTED_RADIUS',
      `Absensi ${type.toUpperCase()}`,
      `Absensi ditolak karena posisi teknisi (${distanceMeters}m) berada di luar radius wajib ${maxAllowedRadius}m dari ${officeName}.`
    );
    writeDb(db);

    return res.status(400).json({
      status: 'error',
      message: `Absensi gagal. Anda berada di luar radius lokasi kerja ${maxAllowedRadius} meter. (Jarak Anda saat ini: ${distanceMeters} meter dari ${officeName}).`,
      details: {
        currentDistanceMeters: distanceMeters,
        maxAllowedRadiusMeters: maxAllowedRadius,
        workLocationName: officeName,
      },
    });
  }

  // Duplicate Photo Prevention
  const previousAttendance = db.attendances.find((a) => a.technicianId === technicianId);
  if (previousAttendance && previousAttendance.photoBase64 && previousAttendance.photoBase64 === photoBase64) {
    return res.status(400).json({
      status: 'error',
      message: 'Foto yang sama terdeteksi. Wajib mengambil foto baru secara langsung dari sensor kamera perangkat!',
    });
  }

  // Cutoff calculation: <= 08:30:00 WIB is TEPAT WAKTU, > 08:30:00 is TERLAMBAT
  let lateStatus: 'TEPAT WAKTU' | 'TERLAMBAT' | 'PULANG' = 'TEPAT WAKTU';
  let minutesLate = 0;

  if (type === 'masuk') {
    const [cutHour, cutMin, cutSec] = db.settings.cutoffTime.split(':').map((n) => parseInt(n, 10) || 0);
    const cutoffTotalSeconds = cutHour * 3600 + cutMin * 60 + cutSec + db.settings.cutoffGraceMinutes * 60;

    if (serverWIB.totalSeconds > cutoffTotalSeconds) {
      lateStatus = 'TERLAMBAT';
      minutesLate = Math.ceil((serverWIB.totalSeconds - cutoffTotalSeconds) / 60);
    } else {
      lateStatus = 'TEPAT WAKTU';
      minutesLate = 0;
    }
  } else {
    lateStatus = 'PULANG';
  }

  const attendanceCode = `ABS-${serverWIB.dateStr.replace(/-/g, '')}-${tech.technicianId.replace(/[^a-zA-Z0-9]/g, '')}-${type.toUpperCase()}`;

  const attendanceRecord = {
    id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    attendanceCode,
    technicianId: tech.id,
    technicianCode: tech.technicianId,
    technicianName: tech.fullName,
    technicianPhone: tech.phone,
    workDate,
    type: type as 'masuk' | 'pulang',
    serverTimestamp: serverWIB.iso,
    localTimeWib: serverWIB.localFormatted,
    deviceTimestamp: deviceTimestamp || new Date().toISOString(),
    latitude,
    longitude,
    accuracy: Math.round(accuracy || 10),
    locationName: locationName || `Area Terverifikasi GPS (${officeName})`,
    workLocationId: targetLocation ? targetLocation.id : undefined,
    workLocationName: officeName,
    distanceToOfficeMeters: distanceMeters,
    maxAllowedRadiusMeters: maxAllowedRadius,
    isWithinRadius: true,
    photoBase64,
    livenessPassed: livenessPassed !== false,
    faceVerified: tech.faceEnrolled,
    lateStatus,
    minutesLate,
  };

  db.attendances.unshift(attendanceRecord);
  if (db.attendances.length > 5000) {
    db.attendances = db.attendances.slice(0, 5000);
  }

  addAuditLog(
    db,
    tech.id,
    tech.fullName,
    'technician',
    type === 'masuk' ? 'CHECK_IN' : 'CHECK_OUT',
    `Absensi ${type.toUpperCase()}`,
    `Absen ${type} sukses pada ${serverWIB.localFormatted} (Status: ${lateStatus}, Jarak: ${distanceMeters}m dari ${officeName})`
  );

  writeDb(db);

  res.json({
    status: 'success',
    message: `Absen ${type === 'masuk' ? 'Masuk' : 'Pulang'} berhasil direkam pada ${serverWIB.localFormatted}! Status: ${lateStatus} (${distanceMeters}m dari ${officeName})`,
    data: attendanceRecord,
  });
});

// 11. Attendances Listing & Correction
app.get('/api/admin/attendances', (req, res) => {
  const db = readDb();
  const { date, month, year, status, technicianId, search, workLocationId } = req.query;

  let filtered = [...db.attendances];

  if (date) filtered = filtered.filter((a) => a.workDate === date);
  if (month && year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    filtered = filtered.filter((a) => a.workDate.startsWith(prefix));
  } else if (year) {
    filtered = filtered.filter((a) => a.workDate.startsWith(String(year)));
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((a) => a.lateStatus === status);
  }

  if (technicianId) {
    filtered = filtered.filter((a) => a.technicianId === technicianId);
  }

  if (workLocationId) {
    filtered = filtered.filter((a) => a.workLocationId === workLocationId);
  }

  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.technicianName.toLowerCase().includes(s) ||
        a.technicianPhone.includes(s) ||
        a.technicianCode.toLowerCase().includes(s) ||
        a.locationName.toLowerCase().includes(s) ||
        a.workLocationName.toLowerCase().includes(s)
    );
  }

  filtered.sort((a, b) => new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime());
  res.json({ status: 'success', count: filtered.length, data: filtered });
});

app.post('/api/admin/attendances/:id/correct', (req, res) => {
  const { id } = req.params;
  const { newStatus, newTimeWib, reason, adminActorId, adminActorName } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ status: 'error', message: 'Alasan koreksi absensi wajib diisi secara jelas (minimal 5 karakter).' });
  }

  const db = readDb();
  const attendance = db.attendances.find((a) => a.id === id);
  if (!attendance) return res.status(404).json({ status: 'error', message: 'Catatan absensi tidak ditemukan.' });

  const oldStatus = attendance.lateStatus;
  const oldTime = attendance.localTimeWib;

  if (newStatus) attendance.lateStatus = newStatus;
  if (newTimeWib) attendance.localTimeWib = newTimeWib;

  attendance.correctionId = 'corr-' + Date.now();
  attendance.correctionReason = reason.trim();
  attendance.correctedBy = adminActorName || 'Administrator';
  attendance.correctedAt = new Date().toISOString();

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'ATTENDANCE_CORRECTION',
    `Absensi ${attendance.attendanceCode} (${attendance.technicianName})`,
    `Koreksi status dari ${oldStatus} (${oldTime}) menjadi ${attendance.lateStatus} (${attendance.localTimeWib}). Alasan: ${reason}`
  );
  writeDb(db);

  res.json({
    status: 'success',
    message: 'Absensi berhasil dikoreksi dan dicatat dalam audit log.',
    data: attendance,
  });
});

// 12. Settings Management
app.get('/api/admin/settings', (req, res) => {
  const db = readDb();
  res.json({ status: 'success', data: db.settings });
});

app.put('/api/admin/settings', (req, res) => {
  const {
    cutoffTime,
    cutoffGraceMinutes,
    officeName,
    officeLatitude,
    officeLongitude,
    officeRadiusMeters,
    defaultRadiusMeters,
    enforceRadius300m,
    enforceGeofence,
    maxGpsAccuracyMeters,
    requireLiveness,
    adminActorId,
    adminActorName,
  } = req.body;

  const db = readDb();
  if (cutoffTime) db.settings.cutoffTime = cutoffTime;
  if (typeof cutoffGraceMinutes === 'number') db.settings.cutoffGraceMinutes = cutoffGraceMinutes;
  if (officeName) db.settings.officeName = officeName;
  if (typeof officeLatitude === 'number') db.settings.officeLatitude = officeLatitude;
  if (typeof officeLongitude === 'number') db.settings.officeLongitude = officeLongitude;
  if (typeof officeRadiusMeters === 'number') db.settings.officeRadiusMeters = officeRadiusMeters;
  if (typeof defaultRadiusMeters === 'number') db.settings.defaultRadiusMeters = defaultRadiusMeters;
  if (typeof enforceRadius300m === 'boolean') db.settings.enforceRadius300m = enforceRadius300m;
  if (typeof enforceGeofence === 'boolean') db.settings.enforceGeofence = enforceGeofence;
  if (typeof maxGpsAccuracyMeters === 'number') db.settings.maxGpsAccuracyMeters = maxGpsAccuracyMeters;
  if (typeof requireLiveness === 'boolean') db.settings.requireLiveness = requireLiveness;

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'UPDATE_SETTINGS',
    'Pengaturan Sistem',
    `Memperbarui aturan batas masuk: ${db.settings.cutoffTime} WIB, Radius default: ${db.settings.defaultRadiusMeters || 300}m`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Pengaturan sistem berhasil disimpan.', data: db.settings });
});

// 13. Audit Logs
app.get('/api/admin/audit-logs', (req, res) => {
  const db = readDb();
  res.json({ status: 'success', data: db.auditLogs.slice(0, 150) });
});

// 14. Leaves Management
app.get('/api/admin/leaves', (req, res) => {
  const db = readDb();
  res.json({ status: 'success', data: db.leaves });
});

app.put('/api/admin/leaves/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, reviewNote, adminActorId, adminActorName } = req.body;

  const db = readDb();
  const leave = db.leaves.find((l) => l.id === id);
  if (!leave) return res.status(404).json({ status: 'error', message: 'Pengajuan tidak ditemukan.' });

  leave.status = status;
  leave.reviewNote = reviewNote || '';
  leave.reviewedBy = adminActorName || 'Admin';
  leave.reviewedAt = new Date().toISOString();

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'REVIEW_LEAVE',
    `Pengajuan ${leave.type.toUpperCase()} - ${leave.technicianName}`,
    `Mengubah status permohonan menjadi ${status}. Catatan: ${reviewNote || '-'}`
  );
  writeDb(db);

  res.json({ status: 'success', message: `Pengajuan berhasil diubah menjadi ${status}.` });
});

// 15. Face Enrollment & Leaves from Technician
app.post('/api/technician/face-enroll', (req, res) => {
  const { technicianId, photoBase64, livenessPassed } = req.body;
  if (!technicianId || !photoBase64) {
    return res.status(400).json({ status: 'error', message: 'Foto wajah via kamera wajib disediakan.' });
  }

  const db = readDb();
  const tech = db.technicians.find((t) => t.id === technicianId);
  if (!tech) return res.status(404).json({ status: 'error', message: 'Teknisi tidak ditemukan.' });

  tech.faceEnrolled = true;
  tech.faceEnrolledAt = new Date().toISOString();
  tech.photoProfile = photoBase64;

  addAuditLog(
    db,
    tech.id,
    tech.fullName,
    'technician',
    'FACE_ENROLLMENT',
    `Wajah Teknisi ${tech.technicianId}`,
    `Pendaftaran wajah teknisi berhasil dilakukan (Liveness: ${livenessPassed ? 'Lulus' : 'Manual'})`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Wajah berhasil didaftarkan dan terverifikasi untuk absensi.', data: tech });
});

app.post('/api/technician/leave', (req, res) => {
  const { technicianId, type, startDate, endDate, reason, attachmentNote } = req.body;
  if (!technicianId || !type || !startDate || !endDate || !reason) {
    return res.status(400).json({ status: 'error', message: 'Semua kolom pengajuan izin/sakit wajib diisi.' });
  }

  const db = readDb();
  const tech = db.technicians.find((t) => t.id === technicianId);
  if (!tech) return res.status(404).json({ status: 'error', message: 'Teknisi tidak ditemukan.' });

  const newLeave = {
    id: 'leave-' + Date.now(),
    technicianId: tech.id,
    technicianName: tech.fullName,
    type: type as 'izin' | 'sakit',
    startDate,
    endDate,
    reason: reason.trim(),
    attachmentNote: attachmentNote ? attachmentNote.trim() : '',
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  db.leaves.unshift(newLeave);
  addAuditLog(
    db,
    tech.id,
    tech.fullName,
    'technician',
    'SUBMIT_LEAVE',
    `Pengajuan ${type.toUpperCase()}`,
    `Pengajuan ${type} dari ${startDate} s/d ${endDate}. Alasan: ${reason}`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Pengajuan izin/sakit berhasil dikirim ke admin.', data: newLeave });
});

// 16. Google Sync Status & Record
app.get('/api/admin/google-sync/status', (req, res) => {
  const db = readDb();
  res.json({
    status: 'success',
    data: {
      lastSync: db.settings.lastGoogleSync || null,
      spreadsheetId: db.settings.googleSpreadsheetId || null,
      driveFolderId: db.settings.googleDriveFolderId || null,
      totalRecords: db.attendances.length,
      totalTechnicians: db.technicians.length,
      totalLocations: db.workLocations.length,
    },
  });
});

app.post('/api/admin/google-sync/record-sync', (req, res) => {
  const { spreadsheetId, driveFolderId, adminActorId, adminActorName } = req.body;
  const db = readDb();

  if (spreadsheetId) db.settings.googleSpreadsheetId = spreadsheetId;
  if (driveFolderId) db.settings.googleDriveFolderId = driveFolderId;
  db.settings.lastGoogleSync = new Date().toISOString();

  addAuditLog(
    db,
    adminActorId || 'admin',
    adminActorName || 'Admin',
    'admin',
    'GOOGLE_SYNC',
    'Google Sheets & Drive',
    `Sinkronisasi 8 sheet berhasil diperbarui pada Spreadsheet ID: ${spreadsheetId || db.settings.googleSpreadsheetId}`
  );
  writeDb(db);

  res.json({ status: 'success', message: 'Status sinkronisasi Google berhasil dicatat.', data: db.settings });
});

// -------------------------------------------------------------
// VITE OR STATIC FILE SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ABSENSI TEKNISI ONLINE] Server aktif di port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
