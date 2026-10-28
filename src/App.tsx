import React, { useEffect, useState } from 'react';
import { UserSession } from './types';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginView } from './views/LoginView';
import { AdminDashboard } from './views/AdminDashboard';
import { TechnicianDashboard } from './views/TechnicianDashboard';
import { api } from './services/api';
import { KeyRound, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('absensi_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('absensi_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Change password modal
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePassMsg, setChangePassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('absensi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('absensi_theme', 'light');
    }
  }, [darkMode]);

  const handleLoginSuccess = (loggedInUser: UserSession, token: string) => {
    setUser(loggedInUser);
    try {
      localStorage.setItem('absensi_user_session', JSON.stringify(loggedInUser));
      localStorage.setItem('absensi_token', token);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('absensi_user_session');
      localStorage.removeItem('absensi_token');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || newPassword.length < 6) {
      setChangePassMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }

    try {
      await api.changePassword(user.id, oldPassword, newPassword, user.type);
      setChangePassMsg({ type: 'success', text: 'Password berhasil diperbarui!' });
      setTimeout(() => {
        setShowChangePassModal(false);
        setOldPassword('');
        setNewPassword('');
        setChangePassMsg(null);
      }, 1500);
    } catch (err: any) {
      setChangePassMsg({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onChangePasswordClick={() => setShowChangePassModal(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <main className="flex-1 pb-12">
        {!user ? (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        ) : user.type === 'admin' ? (
          <AdminDashboard user={user} />
        ) : (
          <TechnicianDashboard
            user={user}
            onRefreshUser={() => {
              // Reload technician data in user state if needed
              setUser({ ...user, faceEnrolled: true });
            }}
          />
        )}
      </main>

      <OfflineIndicator />

      {/* Change Password Modal */}
      {showChangePassModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-500" />
                Ubah Password Akun
              </h3>
              <button
                onClick={() => {
                  setShowChangePassModal(false);
                  setChangePassMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changePassMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold mb-3 ${
                  changePassMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {changePassMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password Lama
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassModal(false);
                    setChangePassMsg(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 ABSENSI TEKNISI ONLINE &bull; Seluruh data dilindungi enkripsi & audit log</span>
          <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
            Waktu Acuan Server: Asia/Jakarta (WIB) &bull; Cutoff: 08:30 WIB
          </span>
        </div>
      </footer>
    </div>
  );
}
