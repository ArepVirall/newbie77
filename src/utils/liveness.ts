export interface LivenessChallenge {
  id: string;
  instruction: string;
  actionHint: string;
  minMotionThreshold: number;
}

export const LIVENESS_CHALLENGES: LivenessChallenge[] = [
  {
    id: 'blink',
    instruction: 'Kedipkan mata Anda secara perlahan',
    actionHint: 'Tatap kamera dan kedipkan mata 2 kali',
    minMotionThreshold: 12,
  },
  {
    id: 'smile',
    instruction: 'Tersenyumlah menghadap kamera',
    actionHint: 'Buka senyuman alami Anda di depan kamera',
    minMotionThreshold: 10,
  },
  {
    id: 'nod',
    instruction: 'Anggukkan kepala sedikit ke depan',
    actionHint: 'Gerakkan kepala perlahan ke bawah lalu kembali',
    minMotionThreshold: 14,
  },
  {
    id: 'turn_slight',
    instruction: 'Tengokkan kepala sedikit ke kanan atau kiri',
    actionHint: 'Tolehkan wajah 15 derajat perlahan',
    minMotionThreshold: 15,
  },
];

export function getRandomChallenge(): LivenessChallenge {
  const index = Math.floor(Math.random() * LIVENESS_CHALLENGES.length);
  return LIVENESS_CHALLENGES[index];
}

/**
 * Calculates optical motion variance between two image frames
 * by sampling pixel lightness differences.
 */
export function calculateFrameMotion(
  canvasPrev: HTMLCanvasElement,
  videoEl: HTMLVideoElement,
  sampleWidth = 160,
  sampleHeight = 160
): { motionScore: number; hasFacePresence: boolean } {
  const ctxPrev = canvasPrev.getContext('2d');
  if (!ctxPrev) return { motionScore: 0, hasFacePresence: false };

  // Create temporary canvas for current frame
  const canvasCurr = document.createElement('canvas');
  canvasCurr.width = sampleWidth;
  canvasCurr.height = sampleHeight;
  const ctxCurr = canvasCurr.getContext('2d');
  if (!ctxCurr) return { motionScore: 0, hasFacePresence: false };

  ctxCurr.drawImage(videoEl, 0, 0, sampleWidth, sampleHeight);

  const prevData = ctxPrev.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const currData = ctxCurr.getImageData(0, 0, sampleWidth, sampleHeight).data;

  let totalDiff = 0;
  let totalBrightness = 0;
  const pixelCount = sampleWidth * sampleHeight;

  // Compare every 4th pixel for speed
  for (let i = 0; i < prevData.length; i += 16) {
    const r1 = prevData[i];
    const g1 = prevData[i + 1];
    const b1 = prevData[i + 2];

    const r2 = currData[i];
    const g2 = currData[i + 1];
    const b2 = currData[i + 2];

    const brightness2 = (r2 + g2 + b2) / 3;
    totalBrightness += brightness2;

    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    totalDiff += diff;
  }

  // Update previous canvas with current frame
  ctxPrev.drawImage(canvasCurr, 0, 0);

  const avgDiff = totalDiff / (pixelCount / 4);
  const avgBrightness = totalBrightness / (pixelCount / 4);

  // A genuine camera feed has moderate illumination and perceptible optical jitter / micro-movement
  const hasFacePresence = avgBrightness > 30 && avgBrightness < 240;

  return {
    motionScore: Math.round(avgDiff * 10) / 10,
    hasFacePresence,
  };
}
