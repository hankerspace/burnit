import type { CompositionSettings } from '../../types';

export interface MediaRecorderExportOptions {
  width: number;
  height: number;
  fps: number;
  videoBitsPerSecond?: number;
  loopDurationMs: number;
  background: CompositionSettings['background'];
}

export function supportsMediaRecorder(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
  );
}

export function supportsWebMRecording(): boolean {
  if (!supportsMediaRecorder()) return false;

  return (
    MediaRecorder.isTypeSupported('video/webm') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
  );
}

export function supportsWebMAlphaRecording(): boolean {
  if (!supportsMediaRecorder()) return false;

  return (
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8,alpha') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9,alpha')
  );
}

export async function exportWebM(
  canvas: HTMLCanvasElement,
  options: MediaRecorderExportOptions
): Promise<Blob> {
  if (!supportsWebMRecording()) {
    throw new Error('WebM recording is not supported in this browser');
  }

  const { fps, videoBitsPerSecond = 2500000, loopDurationMs } = options;

  // Get the best supported MIME type
  let mimeType = 'video/webm';

  if (options.background.type === 'transparent') {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,alpha')) {
      mimeType = 'video/webm;codecs=vp9,alpha';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,alpha')) {
      mimeType = 'video/webm;codecs=vp8,alpha';
    }
  } else {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];

    // Capture canvas stream
    const stream = canvas.captureStream(fps);

    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
    });

    // Handle data chunks
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    // Handle recording completion
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    // Handle errors
    mediaRecorder.onerror = (event) => {
      reject(new Error(`MediaRecorder error: ${event}`));
    };

    // Start recording
    mediaRecorder.start();

    // Stop recording after loop duration
    setTimeout(() => {
      mediaRecorder.stop();

      // Stop all tracks to release the stream
      stream.getTracks().forEach((track) => track.stop());
    }, loopDurationMs);
  });
}

export async function exportPNG(canvas: HTMLCanvasElement, quality: number = 1.0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      },
      'image/png',
      quality
    );
  });
}

export async function exportJPEG(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

export function getOptimalMimeType(includeAlpha: boolean = false): string {
  if (!supportsMediaRecorder()) {
    return '';
  }

  const candidates = includeAlpha
    ? [
        'video/webm;codecs=vp9,alpha',
        'video/webm;codecs=vp8,alpha',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ]
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
}
