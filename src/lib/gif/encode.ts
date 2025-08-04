// @ts-expect-error - gifenc doesn't have TypeScript definitions
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Asset, Layer, CompositionSettings } from '../../types';
import { clearCanvas, drawLayer } from '../canvas/draw';

export interface GifExportOptions {
  width: number;
  height: number;
  fps: number;
  quality: number; // 1-100
  loopDurationMs: number;
  background: CompositionSettings['background'];
}

export async function exportGif(
  layers: Layer[],
  assets: Record<string, Asset>,
  options: GifExportOptions
): Promise<Blob> {
  const { width, height, fps, loopDurationMs } = options;
  
  // Create GIF encoder
  const gif = GIFEncoder();
  
  // Calculate frame count and frame duration
  const frameCount = Math.ceil((loopDurationMs / 1000) * fps);
  const frameDuration = Math.round(1000 / fps); // milliseconds per frame
  
  // Create offscreen canvas for rendering
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get 2D context from OffscreenCanvas');
  }
  
  const drawContext = { ctx, width, height };
  
  // Generate frames
  for (let frame = 0; frame < frameCount; frame++) {
    const currentTime = (frame / frameCount) * loopDurationMs;
    
    // Clear canvas with background
    clearCanvas(drawContext, options.background);
    
    // Draw all layers at current time
    for (const layer of layers) {
      const asset = assets[layer.assetId];
      if (asset && layer.visible) {
        drawLayer(drawContext, layer, asset, currentTime);
      }
    }
    
    // Get image data from canvas
    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Quantize colors to create palette
    const palette = quantize(imageData.data, 256);
    
    // Apply palette to create indexed image
    const index = applyPalette(imageData.data, palette);
    
    // Add frame to GIF
    gif.writeFrame(index, width, height, {
      palette,
      delay: frameDuration, // GIF delay is in centiseconds
      transparent: options.background.type === 'transparent'
    });
  }
  
  // Finish encoding
  gif.finish();
  
  // Return as blob
  const buffer = gif.bytes();
  return new Blob([buffer], { type: 'image/gif' });
}

// Web Worker for GIF encoding to avoid blocking main thread
export function createGifWorker(): Worker {
  const workerCode = `
    importScripts('https://unpkg.com/gifenc@1.0.3/dist/gifenc.min.js');
    
    self.onmessage = async function(e) {
      const { frames, options } = e.data;
      
      try {
        const gif = GIFEncoder();
        
        for (const frame of frames) {
          const { imageData, delay } = frame;
          
          // Quantize colors
          const palette = quantize(imageData.data, 256);
          
          // Apply palette
          const index = applyPalette(imageData.data, palette);
          
          // Add frame
          gif.writeFrame(index, imageData.width, imageData.height, {
            palette,
            delay: delay / 10, // Convert to centiseconds
            transparent: options.transparent
          });
        }
        
        gif.finish();
        
        self.postMessage({
          success: true,
          data: gif.bytes()
        });
      } catch (error) {
        self.postMessage({
          success: false,
          error: error.message
        });
      }
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}