import { AdminAccount, AdminSettings, AttendanceRecord, AuditLogItem, LeaveItem, TechnicianItem } from '../types';

export interface SyncProgressCallback {
  (step: string, percentage: number): void;
}

export interface SyncResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  driveFolderId?: string;
  photosUploadedCount: number;
  message: string;
}

// Helper to execute Google REST API call
async function callGoogleApi(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorText = '';
    try {
      const errJson = await res.json();
      errorText = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorText = await res.text();
    }
    throw new Error(`Google API Error (${res.status}): ${errorText}`);
  }

  return res.json();
}

export const googleSync = {
  // 1. Find or create the Google Drive folder for attendance photos
  async getOrCreateDriveFolder(accessToken: string, folderName = 'ABSENSI TEKNISI ONLINE - FOTO'): Promise<string> {
    // Search existing folder
    const q = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`);
    const searchRes = await callGoogleApi(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      accessToken
    );

    if (searchRes.files && searchRes.files.length > 0) {
      return searchRes.files[0].id;
    }

    // Create new folder
    const createRes = await callGoogleApi('https://www.googleapis.com/drive/v3/files', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Folder penyimpanan foto absensi teknisi lapangan',
      }),
    });

    return createRes.id;
  },

  // 2. Upload photo base64 to Google Drive
  async uploadPhotoToDrive(accessToken: string, folderId: string, fileName: string, base64Data: string): Promise<string> {
    try {
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Multipart upload
      const metadata = {
        name: `${fileName}.jpg`,
        parents: [folderId],
        description: 'Foto verifikasi absensi teknisi',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!uploadRes.ok) {
        throw new Error('Gagal mengupload foto ke Drive');
      }

      const fileData = await uploadRes.json();
      return fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;
    } catch (err) {
      console.warn('Gagal upload foto ke drive, lewati:', err);
      return '';
    }
  },

  // 3. Find or Create the Attendance Master Spreadsheet
  async getOrCreateSpreadsheet(accessToken: string, existingId?: string): Promise<{ id: string; url: string }> {
    if (existingId) {
      try {
        const testRes = await callGoogleApi(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}`, accessToken);
        if (testRes.spreadsheetId) {
          return {
            id: testRes.spreadsheetId,
            url: testRes.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${testRes.spreadsheetId}/edit`,
          };
        }
      } catch {
        console.warn('Existing spreadsheet ID invalid or not accessible, creating new one...');
      }
    }

    // Required 8 sheets as specified in requirement 9
    const sheetsList = [
      'Admin',
      'Teknisi',
      'Absensi',
      'Verifikasi Wajah',
      'Izin dan Sakit',
      'Jadwal Kerja',
      'Pengaturan',
      'Log Aktivitas',
    ];

    const newSpreadsheet = await callGoogleApi('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          title: 'ABSENSI TEKNISI ONLINE - DATABASE UTAMA',
          locale: 'id_ID',
          timeZone: 'Asia/Jakarta',
        },
        sheets: sheetsList.map((title) => ({
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 20,
              frozenRowCount: 1,
            },
          },
        })),
      }),
    });

    return {
      id: newSpreadsheet.spreadsheetId,
      url: newSpreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newSpreadsheet.spreadsheetId}/edit`,
    };
  },

  // 4. Full Sync of all 8 Sheets & Drive Photos
  async syncAllData(
    accessToken: string,
    existingSpreadsheetId: string | undefined,
    data: {
      admins: AdminAccount[];
      technicians: TechnicianItem[];
      attendances: AttendanceRecord[];
      leaves: LeaveItem[];
      settings: AdminSettings;
      auditLogs: AuditLogItem[];
    },
    onProgress?: SyncProgressCallback
  ): Promise<SyncResult> {
    onProgress?.('Memeriksa folder Google Drive...', 10);
    const driveFolderId = await this.getOrCreateDriveFolder(accessToken);

    onProgress?.('Menghubungkan Spreadsheet Google Sheets...', 25);
    const spreadsheet = await this.getOrCreateSpreadsheet(accessToken, existingSpreadsheetId);

    // Upload recent attendance photos to Google Drive
    onProgress?.('Mengunggah foto absensi ke Google Drive...', 45);
    let photosUploaded = 0;
    const driveUrls: Record<string, string> = {};

    // Upload up to 10 latest photos if not already uploaded to prevent quota saturation
    const recentAttendances = data.attendances.slice(0, 10);
    for (const att of recentAttendances) {
      if (att.photoBase64 && !att.photoDriveUrl) {
        const url = await this.uploadPhotoToDrive(
          accessToken,
          driveFolderId,
          `${att.workDate}_${att.technicianCode}_${att.type}`,
          att.photoBase64
        );
        if (url) {
          driveUrls[att.id] = url;
          photosUploaded++;
        }
      }
    }

    onProgress?.('Menyusun format 8 Sheet laporan...', 65);

    // Prepare Sheet 1: Admin
    const adminRows = [
      ['ID Admin', 'Username', 'Nama Lengkap', 'Email Akun Google', 'Peran', 'Status Akun', 'Tanggal Dibuat'],
      ...data.admins.map((a) => [a.id, a.username, a.fullName, a.email, a.role, a.status, a.createdAt]),
    ];

    // Prepare Sheet 2: Teknisi
    const techRows = [
      ['ID Teknisi', 'Kode Teknisi', 'Nama Lengkap', 'Nomor HP (Username)', 'Email', 'Jabatan / Keahlian', 'Area Kerja', 'Status', 'Verifikasi Wajah', 'Tanggal Bergabung'],
      ...data.technicians.map((t) => [
        t.id,
        t.technicianId,
        t.fullName,
        t.phone,
        t.email,
        t.role,
        t.workArea,
        t.status === 'active' ? 'AKTIF' : 'NONAKTIF',
        t.faceEnrolled ? 'TERVERIFIKASI' : 'BELUM VERIFIKASI',
        t.createdAt,
      ]),
    ];

    // Prepare Sheet 3: Absensi (Exact Columns from prompt section 9)
    const attendanceRows = [
      [
        'ID Absensi',
        'ID Teknisi',
        'Nama Teknisi',
        'Nomor HP',
        'Tanggal Kerja',
        'Jenis Absensi',
        'Timestamp Server',
        'Jam Lokal WIB',
        'Latitude',
        'Longitude',
        'Akurasi GPS (m)',
        'Link Foto Google Drive',
        'Status Liveness',
        'Status Verifikasi',
        'Status Keterlambatan',
        'Catatan',
        'ID Koreksi Admin Jika Ada',
      ],
      ...data.attendances.map((att) => [
        att.attendanceCode,
        att.technicianCode,
        att.technicianName,
        att.technicianPhone,
        att.workDate,
        att.type.toUpperCase(),
        att.serverTimestamp,
        att.localTimeWib,
        att.latitude,
        att.longitude,
        att.accuracy,
        driveUrls[att.id] || att.photoDriveUrl || 'Tersimpan di Server Lokal',
        att.livenessPassed ? 'LULUS (Aktif)' : 'MANUAL',
        att.faceVerified ? 'TERVERIFIKASI' : 'TIDAK TERDAFTAR',
        att.lateStatus,
        att.minutesLate > 0 ? `Terlambat ${att.minutesLate} menit` : att.notes || 'Normal',
        att.correctionId ? `${att.correctionId} (${att.correctionReason})` : '-',
      ]),
    ];

    // Prepare Sheet 4: Verifikasi Wajah
    const faceRows = [
      ['ID Teknisi', 'Nama Teknisi', 'Status Wajah', 'Tanggal Pendaftaran', 'Metode Deteksi', 'Kamera Langsung'],
      ...data.technicians.map((t) => [
        t.technicianId,
        t.fullName,
        t.faceEnrolled ? 'TERDAFTAR & TERVERIFIKASI' : 'BELUM TERDAFTAR',
        t.faceEnrolledAt || '-',
        'Liveness Challenge (Kamera Langsung)',
        'Valid',
      ]),
    ];

    // Prepare Sheet 5: Izin dan Sakit
    const leaveRows = [
      ['ID Pengajuan', 'ID Teknisi', 'Nama Teknisi', 'Jenis Pengajuan', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan / Keterangan', 'Status Persetujuan', 'Ditinjau Oleh', 'Catatan Admin'],
      ...data.leaves.map((l) => [
        l.id,
        l.technicianId,
        l.technicianName,
        l.type.toUpperCase(),
        l.startDate,
        l.endDate,
        l.reason,
        l.status.toUpperCase(),
        l.reviewedBy || '-',
        l.reviewNote || '-',
      ]),
    ];

    // Prepare Sheet 6: Jadwal Kerja
    const scheduleRows = [
      ['Parameter Jadwal', 'Nilai Konfigurasi', 'Keterangan'],
      ['Jam Mulai Absen Masuk', data.settings.workStartTime, 'Waktu operasional awal kantor'],
      ['Batas Jam Masuk (Cutoff)', data.settings.cutoffTime, 'Melebihi batas ini dihitung TERLAMBAT'],
      ['Toleransi Keterlambatan', `${data.settings.cutoffGraceMinutes} Menit`, 'Toleransi resmi'],
      ['Jam Pulang Resmi', data.settings.workEndTime, 'Waktu absensi pulang dimulai'],
      ['Zona Waktu Acuan', 'Asia/Jakarta (WIB)', 'Waktu server resmi sebagai acuan tunggal'],
      ['Aturan Keterlambatan', '08:30:00 WIB', '<= 08:30:00 TEPAT WAKTU, > 08:30:00 TERLAMBAT'],
    ];

    // Prepare Sheet 7: Pengaturan
    const settingsRows = [
      ['Pengaturan Sistem', 'Nilai', 'Unit / Detail'],
      ['Nama Kantor / Pusat', data.settings.officeName, 'Lokasi Utama'],
      ['Latitude Kantor', String(data.settings.officeLatitude), 'Derajat'],
      ['Longitude Kantor', String(data.settings.officeLongitude), 'Derajat'],
      ['Radius Geofence Kerja', String(data.settings.officeRadiusMeters), 'Meter'],
      ['Batas Akurasi GPS', `${data.settings.maxGpsAccuracyMeters} Meter`, 'Ambang batas GPS maksimum'],
      ['Deteksi Keaktifan Wajah (Liveness)', data.settings.requireLiveness ? 'AKTIF' : 'NONAKTIF', 'Wajib lulus tantangan live kamera'],
      ['Waktu Sinkronisasi Terakhir', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB', 'Waktu sinkron'],
    ];

    // Prepare Sheet 8: Log Aktivitas
    const auditRows = [
      ['ID Log', 'Waktu (WIB)', 'ID Aktor', 'Nama Aktor', 'Peran', 'Aksi', 'Target Data', 'Keterangan Detail'],
      ...data.auditLogs.map((log) => [
        log.id,
        new Date(log.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        log.actorId,
        log.actorName,
        log.actorRole,
        log.action,
        log.target,
        log.details,
      ]),
    ];

    onProgress?.('Menulis data ke Google Sheets...', 80);

    // Batch update spreadsheet data
    const batchData = [
      { range: 'Admin!A1', values: adminRows },
      { range: 'Teknisi!A1', values: techRows },
      { range: 'Absensi!A1', values: attendanceRows },
      { range: 'Verifikasi Wajah!A1', values: faceRows },
      { range: 'Izin dan Sakit!A1', values: leaveRows },
      { range: 'Jadwal Kerja!A1', values: scheduleRows },
      { range: 'Pengaturan!A1', values: settingsRows },
      { range: 'Log Aktivitas!A1', values: auditRows },
    ];

    await callGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}/values:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: batchData,
        }),
      }
    );

    onProgress?.('Sinkronisasi selesai dengan sukses!', 100);

    return {
      success: true,
      spreadsheetId: spreadsheet.id,
      spreadsheetUrl: spreadsheet.url,
      driveFolderId,
      photosUploadedCount: photosUploaded,
      message: `Berhasil menyinkronkan 8 sheet ke Google Sheets dan ${photosUploaded} foto ke Google Drive!`,
    };
  },
};
