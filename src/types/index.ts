export interface UserSession {
  id: string;
  username?: string;
  technicianId?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  workArea?: string;
  workLocationId?: string;
  workLocationName?: string;
  type: 'admin' | 'technician';
  faceEnrolled?: boolean;
  mustChangePassword?: boolean;
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // default 300
  assignedTechIds: string[]; // empty array = berlaku untuk semua teknisi
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RejectedAttendance {
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
}

export interface AttendanceRecord {
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
}

export interface TechnicianItem {
  id: string;
  technicianId: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  workArea: string;
  workLocationId?: string;
  workLocationName?: string;
  status: 'active' | 'inactive';
  faceEnrolled: boolean;
  faceEnrolledAt?: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface LeaveItem {
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
}

export interface EmailNotificationSettings {
  enabled: boolean;
  adminEmail: string;
  notifyAdminLogin: boolean;
  notifyTechnicianLogin: boolean;
  notifyPasswordChanged: boolean;
  hasResendKey?: boolean;
  hasBrevoKey?: boolean;
}

export interface AdminSettings {
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
  emailNotifications?: EmailNotificationSettings;
}

export interface PasswordResetVerifyResponse {
  valid: boolean;
  email?: string;
  userName?: string;
  userType?: 'admin' | 'technician';
  message?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
  ip?: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'superadmin' | 'full_access' | 'admin' | 'viewer';
  status: 'active' | 'disabled';
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface ServerTimeResponse {
  iso: string;
  dateStr: string;
  timeStr: string;
  localFormatted: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  totalSeconds: number;
  cutoffSeconds: number;
  isLate: boolean;
  minutesLate: number;
  timezone: string;
}
