import type { ImageAsset, VideoAsset } from '../../types';
import { generateId } from '../../utils/id';
import { createBlobUrl } from '../../utils/file';

export async function createImageAsset(file: File): Promise<ImageAsset> {
  const img = new Image();
  const src = createBlobUrl(file);

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        const bitmap = await createImageBitmap(img);

        resolve({
          id: generateId(),
          name: file.name,
          kind: 'image',
          width: img.naturalWidth,
          height: img.naturalHeight,
          src,
          bitmap,
        });
      } catch (error) {
        URL.revokeObjectURL(src);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('Failed to load image'));
    };

    img.src = src;
  });
}

export function supportsWebMVideo(): boolean {
  const video = document.createElement('video');
  return video.canPlayType('video/webm') !== '';
}

export function supportsWebMAlpha(): boolean {
  const video = document.createElement('video');
  // Check for VP8/VP9 with alpha support
  return (
    video.canPlayType('video/webm; codecs="vp8"') !== '' ||
    video.canPlayType('video/webm; codecs="vp9"') !== ''
  );
}

export async function createVideoAsset(file: File): Promise<VideoAsset> {
  if (!supportsWebMVideo()) {
    throw new Error('WebM video format is not supported in this browser');
  }

  const video = document.createElement('video');
  const src = createBlobUrl(file);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
    };

    const onLoadedMetadata = () => {
      cleanup();

      // Ensure we have valid duration
      if (!isFinite(video.duration) || video.duration <= 0) {
        URL.revokeObjectURL(src);
        reject(new Error('Invalid video duration'));
        return;
      }

      resolve({
        id: generateId(),
        name: file.name,
        kind: 'video',
        width: video.videoWidth,
        height: video.videoHeight,
        src,
        durationMs: video.duration * 1000,
        videoEl: video,
      });
    };

    const onError = () => {
      cleanup();
      URL.revokeObjectURL(src);
      reject(new Error('Failed to load video'));
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);

    video.preload = 'metadata';
    video.src = src;
  });
}

export function disposeImageAsset(asset: ImageAsset): void {
  if (asset.bitmap) {
    asset.bitmap.close();
  }

  if (asset.src.startsWith('blob:')) {
    URL.revokeObjectURL(asset.src);
  }
}

export function disposeVideoAsset(asset: VideoAsset): void {
  if (asset.videoEl) {
    asset.videoEl.pause();
    asset.videoEl.removeAttribute('src');
    asset.videoEl.load();
  }

  if (asset.src.startsWith('blob:')) {
    URL.revokeObjectURL(asset.src);
  }
}

export async function seekVideoToTime(video: HTMLVideoElement, timeMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetTime = timeMs / 1000;

    // If already at the correct time (within 1 frame), no need to seek
    const tolerance = 1 / 30; // ~33ms tolerance
    if (Math.abs(video.currentTime - targetTime) < tolerance) {
      resolve();
      return;
    }

    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Video seek failed'));
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    video.currentTime = targetTime;
  });
}

// Video element pool for efficient memory management
class VideoPool {
  private pool: HTMLVideoElement[] = [];
  private maxSize = 10;

  getVideo(): HTMLVideoElement {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return document.createElement('video');
  }

  returnVideo(video: HTMLVideoElement): void {
    if (this.pool.length < this.maxSize) {
      // Reset video state
      video.pause();
      video.removeAttribute('src');
      video.load();
      this.pool.push(video);
    }
  }

  clear(): void {
    this.pool.forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    this.pool.length = 0;
  }
}

export const videoPool = new VideoPool();
