import dotenv from 'dotenv';
dotenv.config();

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  provider: 'resend' | 'brevo' | 'smtp' | 'diagnostic_log';
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Absensi Teknisi Online <onboarding@resend.dev>';

  // 1. Try Resend if configured
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[EMAIL RESEND ERROR]', data);
        return { success: false, provider: 'resend', error: data.message || 'Gagal mengirim email via Resend' };
      }

      console.log(`[EMAIL RESEND SUCCESS] ID: ${data.id} dikirim ke ${options.to}`);
      return { success: true, provider: 'resend', messageId: data.id };
    } catch (err: any) {
      console.error('[EMAIL RESEND EXCEPTION]', err);
      return { success: false, provider: 'resend', error: err.message };
    }
  }

  // 2. Try Brevo if configured
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: 'Absensi Teknisi Online', email: process.env.BREVO_SENDER_EMAIL || 'no-reply@absensiteknisi.com' },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[EMAIL BREVO ERROR]', data);
        return { success: false, provider: 'brevo', error: data.message || 'Gagal mengirim email via Brevo' };
      }

      console.log(`[EMAIL BREVO SUCCESS] ID: ${data.messageId} dikirim ke ${options.to}`);
      return { success: true, provider: 'brevo', messageId: data.messageId };
    } catch (err: any) {
      console.error('[EMAIL BREVO EXCEPTION]', err);
      return { success: false, provider: 'brevo', error: err.message };
    }
  }

  // 3. Fallback: Log email details cleanly in server log for testing & audit
  // (Informs user that credentials are not configured yet, without crashing)
  console.log(`------------------------------------------------------------`);
  console.log(`[EMAIL DIAGNOSTIC LOG] Email Provider: Belum Terkonfigurasi`);
  console.log(`Penerima: ${options.to}`);
  console.log(`Subjek  : ${options.subject}`);
  console.log(`Pesan   : ${options.text || '(HTML content)'}`);
  console.log(`Catatan : Untuk mengaktifkan pengiriman email live, isi RESEND_API_KEY di Netlify/Environment Variables.`);
  console.log(`------------------------------------------------------------`);

  return {
    success: false,
    provider: 'diagnostic_log',
    error: 'RESEND_API_KEY atau BREVO_API_KEY belum dikonfigurasi di Environment Variables.',
  };
}

// Security notification templates
export function buildLoginAlertEmail(params: {
  userName: string;
  userEmail: string;
  role: string;
  timestampWib: string;
  ipAddress: string;
  userAgent: string;
  status: 'BERHASIL' | 'GAGAL';
}) {
  const isSuccess = params.status === 'BERHASIL';
  return {
    subject: `[Keamanan] Notifikasi Login ${isSuccess ? 'Berhasil' : 'Gagal'}: ${params.userName} (${params.role})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background: ${isSuccess ? '#0284c7' : '#dc2626'}; color: white; padding: 16px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">Notifikasi Aktivitas Login Sistem</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Absensi Teknisi Online</p>
        </div>
        <div style="padding: 20px 0; font-size: 13px; line-height: 1.6; color: #334155;">
          <p>Halo Admin,</p>
          <p>Terdeteksi aktivitas login pada sistem dengan rincian sebagai berikut:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; width: 140px;">Nama Pengguna</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${params.userName}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Peran Akun</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${params.role}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Email Terdaftar</td><td style="padding: 8px 0;">${params.userEmail}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Waktu (WIB)</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${params.timestampWib}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Status</td><td style="padding: 8px 0; font-weight: bold; color: ${isSuccess ? '#16a34a' : '#dc2626'};">${params.status}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">IP Address</td><td style="padding: 8px 0; font-family: monospace;">${params.ipAddress}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Perangkat / Browser</td><td style="padding: 8px 0; font-size: 11px; color: #64748b;">${params.userAgent}</td></tr>
          </table>
          <p style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 11px; color: #64748b;">
            ⚠️ Jika aktivitas ini tidak dikenali atau mencurigakan, segera nonaktifkan akun atau ganti kata sandi utama melalui Dashboard Admin.
          </p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
          Email ini dikirim otomatis oleh sistem keamanan Absensi Teknisi Online.
        </div>
      </div>
    `,
  };
}

export function buildPasswordResetEmail(params: {
  userName: string;
  resetLink: string;
  expiresInMinutes: number;
}) {
  return {
    subject: `[Penting] Permintaan Reset Password — Absensi Teknisi Online`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background: #0284c7; color: white; padding: 16px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">Pemulihan Kata Sandi Akun</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Absensi Teknisi Online</p>
        </div>
        <div style="padding: 20px 0; font-size: 13px; line-height: 1.6; color: #334155;">
          <p>Halo <b>${params.userName}</b>,</p>
          <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Silakan klik tombol di bawah ini untuk membuat kata sandi baru:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${params.resetLink}" style="background: #0284c7; color: white; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
              Buat Kata Sandi Baru
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Tautan ini hanya berlaku selama <b>${params.expiresInMinutes} menit</b> dan hanya dapat digunakan satu kali.
          </p>
          <p style="font-size: 11px; color: #94a3b8; word-break: break-all;">
            Jika tombol di atas tidak berfungsi, salin tautan berikut ke browser Anda:<br/>
            ${params.resetLink}
          </p>
          <p style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 11px; color: #64748b; margin-top: 20px;">
            ⚠️ Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini. Akun Anda tetap aman dan kata sandi lama tidak berubah.
          </p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
          Email keamanan otomatis &bull; Absensi Teknisi Online
        </div>
      </div>
    `,
  };
}

export function buildPasswordChangedNotificationEmail(params: {
  userName: string;
  timestampWib: string;
  ipAddress: string;
}) {
  return {
    subject: `[Keamanan] Kata Sandi Akun Anda Berhasil Diubah`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background: #10b981; color: white; padding: 16px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">Kata Sandi Berhasil Diperbarui</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Absensi Teknisi Online</p>
        </div>
        <div style="padding: 20px 0; font-size: 13px; line-height: 1.6; color: #334155;">
          <p>Halo <b>${params.userName}</b>,</p>
          <p>Kata sandi akun Anda pada sistem <b>Absensi Teknisi Online</b> telah berhasil diperbarui.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; width: 140px;">Waktu Perubahan</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${params.timestampWib}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">IP Address</td><td style="padding: 8px 0; font-family: monospace;">${params.ipAddress}</td></tr>
          </table>
          <p style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-size: 12px; color: #b91c1c;">
            ⚠️ <b>Peringatan Keamanan:</b> Jika Anda <b>tidak melakukan</b> perubahan ini, kemungkinan akun Anda telah diakses tanpa izin. Segera hubungi Administrator sistem untuk mengamankan akun Anda.
          </p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
          Email keamanan otomatis &bull; Absensi Teknisi Online
        </div>
      </div>
    `,
  };
}
