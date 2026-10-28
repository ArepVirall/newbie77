import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RefreshCw, X, AlertTriangle, Eye, Sparkles } from 'lucide-react';
import { calculateFrameMotion, getRandomChallenge, LivenessChallenge } from '../utils/liveness';

interface CameraCaptureProps {
  mode?: 'attendance' | 'enrollment';
  attendanceType?: 'masuk' | 'pulang';
  requireLiveness?: boolean;
  onCapture: (photoBase64: string, livenessPassed: boolean) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  mode = 'attendance',
  attendanceType = 'masuk',
  requireLiveness = true,
  onCapture,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Liveness state
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge>(getRandomChallenge());
  const [motionAccumulator, setMotionAccumulator] = useState<number>(0);
  const [livenessPassed, setLivenessPassed] = useState<boolean>(!requireLiveness);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 1. Initialize Direct Camera
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        // Direct front-facing camera via getUserMedia API
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err: any) {
        console.error('Camera Access Error:', err);
        let msg = 'Izin kamera ditolak atau perangkat kamera tidak ditemukan.';
        if (err.name === 'NotAllowedError') {
          msg = 'Izin akses kamera ditolak browser. Harap izinkan kamera pada pengaturan izin situs untuk melanjutkan absensi.';
        } else if (err.name === 'NotFoundError') {
          msg = 'Tidak ada perangkat kamera yang terdeteksi di HP / Komputer ini.';
        }
        if (isMounted) {
          setCameraError(msg);
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // 2. Liveness loop
  useEffect(() => {
    if (!cameraReady || capturedImage || livenessPassed || !requireLiveness) return;

    if (!prevCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 160;
      prevCanvasRef.current = c;
    }

    setIsAnalyzing(true);
    let motionScoreTotal = 0;
    let consecutiveFramesWithFace = 0;

    const interval = setInterval(() => {
      if (videoRef.current && prevCanvasRef.current && videoRef.current.readyState >= 2) {
        const { motionScore, hasFacePresence } = calculateFrameMotion(
          prevCanvasRef.current,
          videoRef.current
        );

        if (hasFacePresence) {
          consecutiveFramesWithFace++;
          if (motionScore > 2.5) {
            motionScoreTotal += motionScore;
            setMotionAccumulator(Math.min(100, Math.round((motionScoreTotal / currentChallenge.minMotionThreshold) * 100)));
          }

          // Verified active human subject
          if (motionScoreTotal >= currentChallenge.minMotionThreshold && consecutiveFramesWithFace >= 6) {
            setLivenessPassed(true);
            setIsAnalyzing(false);
            clearInterval(interval);
          }
        }
      }
    }, 250);

    return () => {
      clearInterval(interval);
      setIsAnalyzing(false);
    };
  }, [cameraReady, capturedImage, livenessPassed, currentChallenge, requireLiveness]);

  // Take Snapshot directly from video element
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for natural mirror selfie view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(base64);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (requireLiveness) {
      setLivenessPassed(false);
      setMotionAccumulator(0);
      setCurrentChallenge(getRandomChallenge());
    }
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    onCapture(capturedImage, livenessPassed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-400" />
              {mode === 'enrollment'
                ? 'Pendaftaran & Verifikasi Wajah'
                : `Foto Absen ${attendanceType === 'masuk' ? 'Masuk' : 'Pulang'}`}
            </h3>
            <p className="text-[11px] text-slate-400">
              Wajib menggunakan kamera depan langsung (Tanpa galeri)
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Camera Area */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-rose-400 max-w-xs">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-rose-500" />
              <p className="text-sm font-semibold mb-2">Kamera Gagal Dibuka</p>
              <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
              >
                Muat Ulang Halaman
              </button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Pratinjau Foto Absensi" className="w-full h-full object-cover" />
          ) : (
            <>
              {/* Direct Live Video */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover -scale-x-100"
              />

              {/* Face Guide Oval Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`w-60 h-72 rounded-[48%] border-2 ${
                    livenessPassed
                      ? 'border-emerald-400 ring-4 ring-emerald-500/20'
                      : 'border-sky-400/80 border-dashed animate-pulse'
                  } transition-all duration-300 flex items-center justify-center`}
                >
                  {!livenessPassed && (
                    <div className="text-center px-4">
                      <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-300 mx-auto mb-2 flex items-center justify-center backdrop-blur-sm">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow-md">
                        Posisikan Wajah Anda di Lingkaran
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Liveness Status Banner */}
              {requireLiveness && (
                <div className="absolute top-3 inset-x-3 pointer-events-none">
                  <div
                    className={`rounded-2xl p-2.5 backdrop-blur-md text-xs font-medium border flex items-center justify-between ${
                      livenessPassed
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900/85 border-sky-500/30 text-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {livenessPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
                      )}
                      <div>
                        <div className="font-bold text-[11px]">
                          {livenessPassed ? 'Keaktifan Terverifikasi!' : currentChallenge.instruction}
                        </div>
                        <div className="text-[9px] text-slate-300">
                          {livenessPassed ? 'Wajah aktif terdeteksi valid' : currentChallenge.actionHint}
                        </div>
                      </div>
                    </div>
                    {!livenessPassed && (
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-sky-400 font-bold">
                          {motionAccumulator}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer / Action Buttons */}
        <div className="p-5 bg-slate-950/80 border-t border-slate-800">
          {capturedImage ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Foto Ulang</span>
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirim Foto Absen</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={takeSnapshot}
                disabled={!cameraReady || (requireLiveness && !livenessPassed && motionAccumulator < 40)}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                  cameraReady && (!requireLiveness || livenessPassed || motionAccumulator >= 40)
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {livenessPassed || !requireLiveness
                    ? 'Ambil Foto Sekarang'
                    : motionAccumulator >= 40
                    ? 'Ambil Foto (Gerakan Terdeteksi)'
                    : 'Lakukan Gerakan Tantangan Terlebih Dahulu...'}
                </span>
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Pencegahan manipulasi aktif: foto diambil real-time dari sensor kamera HP / perangkat Anda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
