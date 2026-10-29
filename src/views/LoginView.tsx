import React, { useState } from 'react';
import { UserSession } from '../types';
import { api } from '../services/api';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Smartphone,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Info,
  Mail,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'technician' | 'admin'>('technician');

  // Technician Form
  const [techPhone, setTechPhone] = useState('');
  const [techPassword, setTechPassword] = useState('');

  // Admin Form
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEmergencyRecovery, setShowEmergencyRecovery] = useState(false);

  // Emergency Recovery (Master Code)
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  // First Login Password Change Modal
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [forceNewPass, setForceNewPass] = useState('');
  const [forceConfirmPass, setForceConfirmPass] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const username = activeTab === 'technician' ? techPhone : adminUsername;
      const password = activeTab === 'technician' ? techPassword : adminPassword;

      const res = await api.login(username, password, activeTab);
      const user = res.user;
      const token = res.token;

      // Check if user is forced to change initial password
      if (user.mustChangePassword) {
        setPendingUser(user);
        setPendingToken(token);
        return;
      }

      onLoginSuccess(user, token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Periksa kembali username/nomor HP dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    if (forceNewPass.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (forceNewPass !== forceConfirmPass) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setLoading(true);
      await api.changePassword(pendingUser.id, '', forceNewPass, pendingUser.type);
      pendingUser.mustChangePassword = false;
      onLoginSuccess(pendingUser, pendingToken || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotFeedback(null);
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotFeedback({ type: 'error', text: 'Masukkan alamat email yang valid.' });
      return;
    }

    try {
      setForgotLoading(true);
      const res = await api.forgotPassword(forgotEmail);
      setForgotFeedback({
        type: 'success',
        text: res.message || 'Jika alamat email terdaftar, instruksi reset kata sandi telah dikirimkan ke email Anda (berlaku 60 menit).',
      });
      setForgotEmail('');
    } catch (err: any) {
      setForgotFeedback({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat memproses permintaan reset kata sandi.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleAdminRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setForgotLoading(true);
      setForgotFeedback(null);
      await api.recoverAdmin(recoveryCode, newAdminPassword || 'admin2026');
      setRecoverySuccess('Kata sandi superadmin berhasil direset ke kata sandi baru! Silakan login kembali.');
    } catch (err: any) {
      setForgotFeedback({ type: 'error', text: err.message || 'Kode pemulihan darurat tidak valid.' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      {/* App Installation Top Banner / Quick Install */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between px-2">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Aplikasi Siap Pasang di Android & Desktop
        </span>
        <PWAInstallButton className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 p-6 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/20">
            <ShieldCheck className="w-8 h-8 text-sky-200" />
          </div>
          <h1 className="text-xl font-black tracking-tight">ABSENSI TEKNISI ONLINE</h1>
          <p className="text-xs text-sky-100/80 mt-1">
            Presensi Lapangan Real-time dengan Kamera Wajah & GPS
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('technician');
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'technician'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Login Teknisi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Login Admin</span>
          </button>
        </div>

        {/* Login Form */}
        <div className="p-6">
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {activeTab === 'technician' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                  Nomor HP Aktif (Username Teknisi)
                </label>
                <input
                  type="tel"
                  required
                  value={techPhone}
                  onChange={(e) => setTechPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                  Username Admin / Email
                </label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-500" />
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotFeedback(null);
                    setShowEmergencyRecovery(false);
                  }}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                >
                  Lupa Kata Sandi?
                </button>
              </div>
              <input
                type="password"
                required
                value={activeTab === 'technician' ? techPassword : adminPassword}
                onChange={(e) =>
                  activeTab === 'technician' ? setTechPassword(e.target.value) : setAdminPassword(e.target.value)
                }
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : activeTab === 'technician' ? (
                'Masuk ke Halaman Absen'
              ) : (
                'Masuk Dashboard Admin'
              )}
            </button>
          </form>

          {/* Helper Credentials Hint for Initial Setup */}
          {activeTab === 'admin' && (
            <div className="mt-4 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Akun Awal Administrator:</span>
              </div>
              <div>Username: <code className="font-bold text-slate-800 dark:text-slate-100">admin</code></div>
              <div>Password awal: <code className="font-bold text-slate-800 dark:text-slate-100">admin2026</code></div>
              <div className="text-[10px] text-slate-400 pt-1">
                *Sistem mewajibkan penggantian kata sandi pada login pertama kali demi standar keamanan.
              </div>
            </div>
          )}

          {activeTab === 'technician' && (
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Akun teknisi didaftarkan oleh admin perusahaan. Hubungi admin operasional untuk mendapatkan nomor HP & password akun Anda.
              <br />
              <span className="font-medium text-slate-700 dark:text-slate-300 mt-1 block">
                Akun contoh: <code>081234567890</code> / <code>teknisi123</code>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: FORCED FIRST-TIME PASSWORD CHANGE */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
              Wajib Ubah Kata Sandi Awal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
              Demi keamanan akun {pendingUser.fullName}, Anda wajib membuat kata sandi baru sebelum dapat menggunakan aplikasi.
            </p>

            <form onSubmit={handleForcePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={forceNewPass}
                  onChange={(e) => setForceNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  value={forceConfirmPass}
                  onChange={(e) => setForceConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow mt-2"
              >
                {loading ? 'Menyimpan...' : 'Simpan & Lanjutkan Masuk'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LUPA KATA SANDI (EMAIL RESET & EMERGENCY RECOVERY) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-sky-500" />
              Pemulihan Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {showEmergencyRecovery
                ? 'Gunakan kode pemulihan master darurat untuk mereset akun Super Admin.'
                : 'Masukkan alamat email yang terdaftar untuk menerima tautan pemulihan kata sandi.'}
            </p>

            {recoverySuccess ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{recoverySuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setRecoverySuccess(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
                >
                  Kembali ke Halaman Login
                </button>
              </div>
            ) : forgotFeedback && forgotFeedback.type === 'success' ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <div className="font-bold mb-0.5">Tautan Terkirim!</div>
                    <p>{forgotFeedback.text}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Periksa kotak masuk (atau folder Spam/Promotions) email Anda. Klik tautan dalam email untuk membuat kata sandi baru.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotFeedback(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
                >
                  Tutup & Kembali
                </button>
              </div>
            ) : !showEmergencyRecovery ? (
              /* Email Reset Form (Admin & Technician) */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                {forgotFeedback && forgotFeedback.type === 'error' && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotFeedback.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-500" />
                    Alamat Email Terdaftar
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@perusahaan.co.id"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Bisa berupa email Admin atau email Teknisi Lapangan.
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}
                  </button>
                </div>

                {activeTab === 'admin' && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmergencyRecovery(true);
                        setForgotFeedback(null);
                      }}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Gunakan Kode Master Pemulihan Darurat
                    </button>
                  </div>
                )}
              </form>
            ) : (
              /* Emergency Recovery Form (Super Admin) */
              <form onSubmit={handleAdminRecovery} className="space-y-3">
                {forgotFeedback && forgotFeedback.type === 'error' && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotFeedback.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Pemulihan Darurat Master
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="RECOVER-ADMIN-2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Kode bawaan: RECOVER-ADMIN-2026</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="admin2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmergencyRecovery(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                  >
                    {forgotLoading ? 'Memproses...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
