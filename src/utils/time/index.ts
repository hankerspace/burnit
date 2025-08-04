export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = ms % 1000;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${Math.floor(remainingMs / 100)}`;
  }

  return `${remainingSeconds}.${Math.floor(remainingMs / 100)}s`;
}

export function parseTime(timeStr: string): number {
  // Parse formats like "1:23.4" or "23.4s"
  const timeRegex = /^(?:(\d+):)?(\d+)\.?(\d)?s?$/;
  const match = timeStr.match(timeRegex);

  if (!match) return 0;

  const minutes = parseInt(match[1] || '0');
  const seconds = parseInt(match[2] || '0');
  const tenths = parseInt(match[3] || '0');

  return minutes * 60 * 1000 + seconds * 1000 + tenths * 100;
}

export function timeToFrame(timeMs: number, fps: number): number {
  return Math.floor((timeMs / 1000) * fps);
}

export function frameToTime(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}

export function getFrameAtTime(
  timeMs: number,
  totalDurationMs: number,
  frameCount: number
): number {
  if (totalDurationMs === 0 || frameCount === 0) return 0;

  const normalizedTime = (timeMs % totalDurationMs) / totalDurationMs;
  return Math.floor(normalizedTime * frameCount) % frameCount;
}
