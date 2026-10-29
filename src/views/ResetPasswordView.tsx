import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PasswordResetVerifyResponse } from '../types';
import { ShieldCheck, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Lock } from 'lucide-react';

interface ResetPasswordViewProps {
  token: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  token,
  onSuccess,
  onBackToLogin,
}) => {
  const [verifying, setVerifying] = useState(true);
  const [verifyData, setVerifyData] = useState<PasswordResetVerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkToken() {
      try {
        setVerifying(true);
        setVerifyError(null);
        const res = await api.verifyResetToken(token);
        if (isMounted) {
          setVerifyData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setVerifyError(err.message || 'Tautan pemulihan kata sandi tidak valid atau telah kedaluwarsa.');
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    }

    if (token) {
      checkToken();
    } else {
      setVerifying(false);
      setVerifyError('Token pemulihan tidak ditemukan pada URL.');
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 6) {
      setSubmitError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Konfirmasi kata sandi tidak sesuai.');
      return;
    }

    try {
      setSubmitting(true);
      await api.resetPassword(token, newPassword);
      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mereset kata sandi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/20">
            <KeyRound className="w-6 h-6 text-sky-200" />
          </div>
          <h1 className="text-lg font-black tracking-tight">PEMULIHAN KATA SANDI</h1>
          <p className="text-xs text-sky-100/80 mt-1">Absensi Teknisi Online</p>
        </div>

        <div className="p-6">
          {verifying ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Memverifikasi tautan keamanan reset kata sandi...</p>
            </div>
          ) : verifyError ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <div className="font-bold mb-1">Tautan Tidak Berlaku</div>
                  <p>{verifyError}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Halaman Login</span>
              </button>
            </div>
          ) : submitSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Kata Sandi Berhasil Diperbarui!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Anda sekarang dapat masuk ke aplikasi menggunakan kata sandi baru. Mengarahkan ke halaman login...
                </p>
              </div>
              <button
                type="button"
                onClick={onSuccess}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow transition"
              >
                Masuk Sekarang
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-bold text-sky-800 dark:text-sky-300">Akun Terverifikasi:</div>
                <div className="mt-1 font-medium">{verifyData?.userName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Email: {verifyData?.email}</div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-500" />
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-500" />
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-[0.98]"
              >
                {submitting ? 'Menyimpan Kata Sandi Baru...' : 'Simpan Kata Sandi & Masuk'}
              </button>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 pt-1 block"
              >
                Batal dan Kembali ke Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
