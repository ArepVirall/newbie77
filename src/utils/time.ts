export function formatWIBDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatWIBTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d) + ' WIB';
  } catch {
    return dateString;
  }
}

export function isPastCutoff(timeStr: string, cutoff = '08:30:00'): { isLate: boolean; minutesLate: number } {
  const [h, m, s] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const [cH, cM, cS] = cutoff.split(':').map((v) => parseInt(v, 10) || 0);

  const currentSec = h * 3600 + m * 60 + s;
  const cutoffSec = cH * 3600 + cM * 60 + cS;

  if (currentSec > cutoffSec) {
    return {
      isLate: true,
      minutesLate: Math.ceil((currentSec - cutoffSec) / 60),
    };
  }
  return {
    isLate: false,
    minutesLate: 0,
  };
}
