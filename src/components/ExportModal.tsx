import React, { useState } from 'react';
import { AttendanceRecord, AdminSettings } from '../types';
import { FileSpreadsheet, Printer, X, Download, Calendar, Filter } from 'lucide-react';

interface ExportModalProps {
  attendances: AttendanceRecord[];
  settings: AdminSettings;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ attendances, settings, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // e.g. '2026-10'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter attendances based on month and status
  const filtered = attendances.filter((att) => {
    const matchMonth = selectedMonth ? att.workDate.startsWith(selectedMonth) : true;
    const matchStatus = statusFilter === 'ALL' ? true : att.lateStatus === statusFilter;
    return matchMonth && matchStatus;
  });

  const totalFiltered = filtered.length;
  const onTimeCount = filtered.filter((a) => a.lateStatus === 'TEPAT WAKTU').length;
  const lateCount = filtered.filter((a) => a.lateStatus === 'TERLAMBAT').length;

  // 1. Export CSV for Excel
  const handleDownloadExcel = () => {
    const headers = [
      'No',
      'ID Absensi',
      'Kode Teknisi',
      'Nama Teknisi',
      'Nomor HP',
      'Tanggal Kerja',
      'Jenis Absen',
      'Jam WIB',
      'Status Kehadiran',
      'Keterlambatan (Menit)',
      'Akurasi GPS (m)',
      'Lokasi Terdeteksi',
      'Jarak Kantor (m)',
      'Liveness Wajah',
      'Catatan / Koreksi',
    ];

    const rows = filtered.map((att, idx) => [
      idx + 1,
      att.attendanceCode,
      att.technicianCode,
      `"${att.technicianName.replace(/"/g, '""')}"`,
      `'${att.technicianPhone}`,
      att.workDate,
      att.type.toUpperCase(),
      att.localTimeWib,
      att.lateStatus,
      att.minutesLate,
      att.accuracy,
      `"${att.locationName.replace(/"/g, '""')}"`,
      att.distanceToOfficeMeters,
      att.livenessPassed ? 'LULUS' : 'MANUAL',
      `"${(att.correctionReason || att.notes || '-').replace(/"/g, '""')}"`,
    ]);

    // Prepend UTF-8 BOM for Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Absensi_Teknisi_${selectedMonth || 'Semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Print / PDF generation
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Absensi Teknisi - ${selectedMonth}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 25px; margin: 0; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; }
          .company-name { font-size: 18px; font-weight: bold; color: #0284c7; }
          .doc-title { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .period { font-size: 11px; color: #64748b; margin-top: 3px; }
          .summary-box { display: flex; gap: 15px; margin-bottom: 18px; background: #f8fafc; padding: 10px; border-radius: 6px; }
          .stat { flex: 1; text-align: center; font-size: 11px; }
          .stat b { display: block; font-size: 14px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; color: #334155; font-weight: bold; padding: 7px 5px; border: 1px solid #cbd5e1; font-size: 10px; text-align: left; }
          td { padding: 6px 5px; border: 1px solid #e2e8f0; font-size: 10px; }
          .status-tepat { color: #16a34a; font-weight: bold; }
          .status-terlambat { color: #dc2626; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
          .sig-box { text-align: center; width: 200px; }
          .sig-line { border-bottom: 1px solid #334155; margin-top: 60px; margin-bottom: 5px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">ABSENSI TEKNISI ONLINE</div>
          <div class="doc-title">REKAPITULASI LAPORAN KEHADIRAN TEKNISI LAPANGAN</div>
          <div class="period">Periode Bulan: ${selectedMonth} &bull; Batas Masuk: 08:30 WIB</div>
        </div>

        <div class="summary-box">
          <div class="stat">Total Kehadiran: <b>${totalFiltered}</b></div>
          <div class="stat">Tepat Waktu: <b style="color: #16a34a">${onTimeCount}</b></div>
          <div class="stat">Terlambat: <b style="color: #dc2626">${lateCount}</b></div>
          <div class="stat">Persentase Keterlambatan: <b>${
            totalFiltered > 0 ? Math.round((lateCount / totalFiltered) * 100) : 0
          }%</b></div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="30">No</th>
              <th>Kode</th>
              <th>Nama Teknisi</th>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Jam WIB</th>
              <th>Status</th>
              <th>Telat</th>
              <th>Lokasi GPS</th>
              <th>Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (a, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${a.technicianCode}</td>
                <td><b>${a.technicianName}</b></td>
                <td>${a.workDate}</td>
                <td>${a.type.toUpperCase()}</td>
                <td>${a.localTimeWib}</td>
                <td class="${a.lateStatus === 'TERLAMBAT' ? 'status-terlambat' : 'status-tepat'}">${a.lateStatus}</td>
                <td>${a.minutesLate > 0 ? `${a.minutesLate}m` : '-'}</td>
                <td>${a.locationName.slice(0, 35)}... (&plusmn;${a.accuracy}m)</td>
                <td>${a.livenessPassed ? 'Liveness Lulus' : 'Manual'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div>Dibuat Oleh:</div>
            <div class="sig-line"></div>
            <div><b>Admin Operasional</b></div>
          </div>
          <div class="sig-box">
            <div>Mengetahui:</div>
            <div class="sig-line"></div>
            <div><b>Kepala Divisi Lapangan</b></div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-sky-500" />
              Ekspor & Cetak Laporan Absensi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format kompatibel Microsoft Excel dan Cetak PDF resmi
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Selection */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              Pilih Bulan Laporan
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-500" />
              Filter Status Kehadiran
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Status (Tepat Waktu, Terlambat, Pulang)</option>
              <option value="TEPAT WAKTU">Hanya Tepat Waktu (&le; 08:30 WIB)</option>
              <option value="TERLAMBAT">Hanya Terlambat (&gt; 08:30 WIB)</option>
              <option value="PULANG">Hanya Absen Pulang</option>
            </select>
          </div>

          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/40 flex justify-between items-center text-xs">
            <span className="text-slate-600 dark:text-slate-300">Data Terpilih:</span>
            <span className="font-bold text-sky-700 dark:text-sky-300">{totalFiltered} rekaman absensi</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Excel (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md shadow-sky-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
