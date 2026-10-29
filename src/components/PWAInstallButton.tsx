import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X, Monitor, CheckCircle2, Info } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  showAlways?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className, showAlways = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled && !showAlways) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95'
        }
        title="Pasang aplikasi di HP Android atau Komputer (PWA)"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install Aplikasi (PWA)</span>
      </button>

      {/* Manual Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-500" />
                Cara Pasang Aplikasi
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-100 dark:border-sky-900/40">
                <div className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1 mb-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  Di HP Android (Chrome):
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Ketuk ikon titik tiga (<strong>⋮</strong>) di pojok kanan atas browser Chrome.</li>
                  <li>Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
                  <li>Ikon Absensi Teknisi akan langsung terpasang di menu HP Anda!</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Monitor className="w-3.5 h-3.5 text-slate-500" />
                  Di Komputer / Laptop (Chrome / Edge):
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Klik ikon <strong>Instal</strong> (tanda monitor dengan panah ke bawah) di ujung kanan bilah alamat (URL bar).</li>
                  <li>Atau klik menu titik tiga (<strong>⋮</strong>) &gt; pilih <strong>"Instal Absensi Teknisi Online"</strong>.</li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px]">
                  <strong>Di iPhone / iPad (Safari):</strong> Ketuk tombol <strong>Bagikan (Share)</strong> lalu pilih <strong>"Tambahkan ke Layar Utama (Add to Home Screen)"</strong>.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-4 w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition shadow"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
