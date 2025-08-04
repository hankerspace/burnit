import type { Project } from '../../types';
import { clearCanvas, drawLayer } from '../canvas/draw';
import { exportGif } from '../gif/encode';
import { exportWebM } from '../media/recorder';

/**
 * Renders a project to a canvas at a specific time
 */
export function renderProjectToCanvas(
  project: Project,
  currentTime: number = 0,
  canvas?: HTMLCanvasElement
): HTMLCanvasElement {
  // Create canvas if not provided
  const targetCanvas = canvas || document.createElement('canvas');
  const ctx = targetCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const { settings, layers, assets } = project;
  
  // Set canvas dimensions to match project settings
  targetCanvas.width = settings.width;
  targetCanvas.height = settings.height;
  
  // Create draw context
  const drawContext = {
    ctx,
    width: settings.width,
    height: settings.height
  };
  
  // Clear canvas with background
  clearCanvas(drawContext, settings.background);
  
  // Draw layers in order
  for (const layer of layers) {
    const asset = assets[layer.assetId];
    if (asset) {
      drawLayer(drawContext, layer, asset, currentTime);
    }
  }
  
  return targetCanvas;
}

/**
 * Exports a project as PNG
 */
export function exportProjectAsPNG(
  project: Project,
  currentTime: number = 0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = renderProjectToCanvas(project, currentTime);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exports a project as JPEG
 */
export function exportProjectAsJPEG(
  project: Project,
  currentTime: number = 0,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = renderProjectToCanvas(project, currentTime);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob'));
        }
      }, 'image/jpeg', quality);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exports a project as GIF
 */
export function exportProjectAsGIF(
  project: Project,
  quality: number = 80,
  loopDurationMs: number = 3000
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const { settings, layers, assets } = project;
      
      const options = {
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        quality,
        loopDurationMs,
        background: settings.background
      };
      
      const blob = await exportGif(layers, assets, options);
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exports a project as WebM
 */
export function exportProjectAsWebM(
  project: Project,
  videoBitsPerSecond: number = 2500000,
  loopDurationMs: number = 3000
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const { settings } = project;
      
      // Create a canvas and render the project animation
      const canvas = document.createElement('canvas');
      canvas.width = settings.width;
      canvas.height = settings.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      const drawContext = {
        ctx,
        width: settings.width,
        height: settings.height
      };
      
      // Start animation loop for WebM recording
      const frameCount = Math.ceil((loopDurationMs / 1000) * settings.fps);
      let currentFrame = 0;
      
      const animate = () => {
        const currentTime = (currentFrame / frameCount) * loopDurationMs;
        
        // Clear and draw frame
        clearCanvas(drawContext, settings.background);
        for (const layer of project.layers) {
          const asset = project.assets[layer.assetId];
          if (asset && layer.visible) {
            drawLayer(drawContext, layer, asset, currentTime);
          }
        }
        
        currentFrame++;
        if (currentFrame < frameCount) {
          requestAnimationFrame(animate);
        }
      };
      
      // Start animation
      animate();
      
      const options = {
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        videoBitsPerSecond,
        loopDurationMs,
        background: settings.background
      };
      
      const blob = await exportWebM(canvas, options);
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for export based on project name and format
 */
export function generateExportFilename(
  projectName: string,
  format: 'png' | 'jpeg' | 'gif' | 'webm',
  timestamp?: Date
): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${sanitizedName}_${dateStr}.${format}`;
}