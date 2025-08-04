import { parseGIF, decompressFrames } from 'gifuct-js';
import type { GifFrame, GifAsset } from '../../types';
import { generateId } from '../../utils/id';
import { createBlobUrl } from '../../utils/file';

export interface ParsedGifFrame {
  patch: Uint8ClampedArray;
  dims: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  delay: number;
  disposalType: number;
}

export async function decodeGif(file: File): Promise<GifAsset> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  const { width, height } = gif.lsd;
  const gifFrames: GifFrame[] = [];
  let totalDurationMs = 0;

  // Create a canvas to composite frames
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Track the previous frame for disposal handling
  let previousImageData: ImageData | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i] as ParsedGifFrame;

    // Handle disposal of previous frame
    if (i > 0) {
      const prevFrame = frames[i - 1] as ParsedGifFrame;

      if (prevFrame.disposalType === 2) {
        // Restore to background
        ctx.clearRect(0, 0, width, height);
      } else if (prevFrame.disposalType === 3 && previousImageData) {
        // Restore to previous
        ctx.putImageData(previousImageData, 0, 0);
      }
    }

    // Save current state if needed for disposal
    if (frame.disposalType === 3) {
      previousImageData = ctx.getImageData(0, 0, width, height);
    }

    // Create ImageData from frame patch
    const imageData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);

    // Draw frame to canvas
    ctx.putImageData(imageData, frame.dims.left, frame.dims.top);

    // Create ImageBitmap from current canvas state
    const bitmap = await createImageBitmap(canvas);

    const durationMs = Math.max(frame.delay, 10);

    gifFrames.push({
      bitmap,
      durationMs,
    });

    totalDurationMs += durationMs;
  }

  return {
    id: generateId(),
    name: file.name,
    kind: 'gif',
    width,
    height,
    src: createBlobUrl(file),
    frames: gifFrames,
    totalDurationMs,
    loopCount: (gif as { gce?: { loopCount?: number } }).gce?.loopCount || 'infinite',
  };
}

export function getFrameAtTime(gifAsset: GifAsset, timeMs: number): GifFrame {
  if (gifAsset.frames.length === 0) {
    throw new Error('No frames in GIF asset');
  }

  // Handle looping
  const loopTime = timeMs % gifAsset.totalDurationMs;
  let accumulatedTime = 0;

  for (const frame of gifAsset.frames) {
    accumulatedTime += frame.durationMs;
    if (loopTime < accumulatedTime) {
      return frame;
    }
  }

  // Fallback to last frame
  return gifAsset.frames[gifAsset.frames.length - 1];
}

export function getFrameIndexAtTime(gifAsset: GifAsset, timeMs: number): number {
  if (gifAsset.frames.length === 0) {
    return 0;
  }

  const loopTime = timeMs % gifAsset.totalDurationMs;
  let accumulatedTime = 0;

  for (let i = 0; i < gifAsset.frames.length; i++) {
    accumulatedTime += gifAsset.frames[i].durationMs;
    if (loopTime < accumulatedTime) {
      return i;
    }
  }

  return gifAsset.frames.length - 1;
}

export function disposeGifAsset(gifAsset: GifAsset): void {
  // Clean up ImageBitmaps
  gifAsset.frames.forEach((frame) => {
    if (frame.bitmap) {
      frame.bitmap.close();
    }
  });

  // Revoke blob URL
  if (gifAsset.src.startsWith('blob:')) {
    URL.revokeObjectURL(gifAsset.src);
  }
}
