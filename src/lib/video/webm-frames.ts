import type { GifFrame, GifAsset } from '../../types';
import { generateId } from '../../utils/id';
import { createBlobUrl } from '../../utils/file';

export interface WebMFrameExtractionOptions {
  maxFrames?: number;
  frameRate?: number; // Extract at this FPS, default will use video's FPS
}

/**
 * Extract frames from a WebM video file and create a GIF-like asset
 * This treats animated WebM files as frame sequences like GIFs
 */
export async function extractWebMFrames(
  file: File, 
  options: WebMFrameExtractionOptions = {}
): Promise<GifAsset> {
  const video = document.createElement('video');
  const src = createBlobUrl(file);
  
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      URL.revokeObjectURL(src);
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load WebM video'));
    };

    const onLoadedMetadata = async () => {
      try {
        const { width, height, duration } = video;
        
        if (!isFinite(duration) || duration <= 0) {
          cleanup();
          reject(new Error('Invalid WebM video duration'));
          return;
        }

        const frameRate = options.frameRate || 30; // Default to 30 FPS
        const maxFrames = options.maxFrames || Math.min(Math.ceil(duration * frameRate), 300); // Cap at 300 frames
        const frameDuration = 1 / frameRate;
        const frames: GifFrame[] = [];
        
        // Create canvas for frame extraction
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Extract frames at regular intervals
        for (let i = 0; i < maxFrames; i++) {
          const timeSeconds = (i * duration) / maxFrames;
          
          try {
            // Seek to the specific time
            await seekVideoToTime(video, timeSeconds * 1000);
            
            // Draw current frame to canvas
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(video, 0, 0, width, height);
            
            // Create ImageBitmap from canvas
            const bitmap = await createImageBitmap(canvas);
            
            frames.push({
              bitmap,
              durationMs: frameDuration * 1000 // Convert to milliseconds
            });
          } catch (error) {
            console.warn(`Failed to extract frame at ${timeSeconds}s:`, error);
            // Continue with other frames
          }
        }

        if (frames.length === 0) {
          cleanup();
          reject(new Error('No frames could be extracted from WebM'));
          return;
        }

        const totalDurationMs = frames.reduce((sum, frame) => sum + frame.durationMs, 0);

        const webmAsset: GifAsset = {
          id: generateId(),
          name: file.name,
          kind: 'gif', // Treat as GIF for compatibility
          width,
          height,
          src: createBlobUrl(file), // Create new blob URL for the asset
          frames,
          totalDurationMs,
          loopCount: 'infinite'
        };

        // Debug logging
        console.log(`WebM processed as animated frames: ${file.name}`, {
          originalDuration: duration,
          extractedFrames: frames.length,
          totalDuration: totalDurationMs,
          frameRate,
          dimensions: `${width}x${height}`
        });

        cleanup();
        resolve(webmAsset);
        
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);
    
    video.preload = 'metadata';
    video.src = src;
  });
}

/**
 * Seek video to specific time in milliseconds
 */
async function seekVideoToTime(video: HTMLVideoElement, timeMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetTime = timeMs / 1000;
    
    // If already at the correct time (within tolerance), no need to seek
    const tolerance = 1 / 60; // ~16ms tolerance
    if (Math.abs(video.currentTime - targetTime) < tolerance) {
      resolve();
      return;
    }

    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      clearTimeout(timeoutId);
    };

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Video seek failed'));
    };

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Video seek timeout'));
    }, 5000);

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    
    video.currentTime = targetTime;
  });
}

/**
 * Check if a WebM file should be treated as animated frames
 * This is a heuristic - we assume WebM files with reasonable duration should be treated as animations
 */
export function shouldTreatWebMAsAnimated(file: File): boolean {
  // For now, always treat WebM as animated
  // In the future, we could add more sophisticated detection
  return file.type === 'video/webm';
}