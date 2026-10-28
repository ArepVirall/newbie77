import React, { useEffect, useState } from 'react';
import { UserSession } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { Clock, ShieldCheck, Sun, Moon, LogOut, KeyRound, User as UserIcon } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  user: UserSession | null;
  onLogout: () => void;
  onChangePasswordClick: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onChangePasswordClick,
  darkMode,
  onToggleDarkMode,
}) => {
  const [wibTimeStr, setWibTimeStr] = useState<string>('--:--:-- WIB');
  const [isPast0830, setIsPast0830] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch from server
    const fetchTime = async () => {
      try {
        const timeData = await api.getServerTime();
        setWibTimeStr(timeData.localFormatted);
        setIsPast0830(timeData.isLate);
      } catch (err) {
        console.warn('Gagal ambil server time, gunakan waktu lokal WIB:', err);
      }
    };
    fetchTime();

    // Live clock ticker synced with WIB
    const timer = setInterval(() => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const h = parts.find((p) => p.type === 'hour')?.value || '00';
      const m = parts.find((p) => p.type === 'minute')?.value || '00';
      const s = parts.find((p) => p.type === 'second')?.value || '00';

      setWibTimeStr(`${h}:${m}:${s} WIB`);
      const totalSec = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10);
      setIsPast0830(totalSec > 8 * 3600 + 30 * 60);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                ABSENSI TEKNISI
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                ONLINE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">
              Sistem Presensi Lapangan Real-time & GPS
            </p>
          </div>
        </div>

        {/* Server Clock Ticker */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Clock className={`w-3.5 h-3.5 ${isPast0830 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
          <div className="text-left">
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 leading-none">
              {wibTimeStr}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
              Batas: 08:30 WIB {isPast0830 ? '(Terlambat)' : '(Tepat Waktu)'}
            </div>
          </div>
        </div>

        {/* Right Tools & User Actions */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Profile Info & Menu */}
          {user && (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {user.fullName}
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {user.type === 'admin' ? 'Administrator' : user.technicianId || 'Teknisi'}
                </span>
              </div>

              <button
                onClick={onChangePasswordClick}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Ubah Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={onLogout}
                className="flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition text-xs font-semibold"
                title="Keluar dari Aplikasi"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
