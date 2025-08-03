import type { Project, ExportOptions } from '../types';
import { exportGif } from './gif/encode';
import { exportWebM, exportPNG, exportJPEG, supportsWebMRecording } from './media/recorder';
import { clearCanvas, drawLayer, drawLayerAsync } from './canvas/draw';

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'encoding' | 'complete';
  progress: number; // 0-100
  message: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export class ExportService {
  private static instance: ExportService;
  
  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export project with the given options
   */
  async export(
    project: Project,
    options: ExportOptions,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    const { format, width, height, fps, quality, transparency, loopDurationMs } = options;
    
    // Use project settings if not specified
    const exportWidth = width || project.settings.width;
    const exportHeight = height || project.settings.height;
    const exportFps = fps || project.settings.fps;
    const exportDuration = loopDurationMs || this.calculateLoopDuration(project);
    const exportQuality = quality || 0.9;
    
    onProgress?.({
      stage: 'preparing',
      progress: 0,
      message: 'Preparing export...'
    });

    try {
      switch (format) {
        case 'png':
          return await this.exportStaticImage(
            project, 
            'png', 
            exportWidth, 
            exportHeight, 
            exportQuality,
            onProgress
          );
          
        case 'jpeg':
          return await this.exportStaticImage(
            project, 
            'jpeg', 
            exportWidth, 
            exportHeight, 
            exportQuality,
            onProgress
          );
          
        case 'gif':
          return await this.exportAnimatedGif(
            project,
            exportWidth,
            exportHeight,
            exportFps,
            exportDuration,
            exportQuality,
            transparency || false,
            onProgress
          );
          
        case 'webm':
          return await this.exportWebMVideo(
            project,
            exportWidth,
            exportHeight,
            exportFps,
            exportDuration,
            transparency || false,
            onProgress
          );
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      onProgress?.({
        stage: 'complete',
        progress: 0,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  /**
   * Export a static image (PNG or JPEG)
   */
  private async exportStaticImage(
    project: Project,
    format: 'png' | 'jpeg',
    width: number,
    height: number,
    quality: number,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    onProgress?.({
      stage: 'rendering',
      progress: 25,
      message: 'Rendering frame...'
    });

    // Create render canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    const drawContext = { ctx, width, height };
    
    // Clear with background
    clearCanvas(drawContext, project.settings.background);
    
    onProgress?.({
      stage: 'rendering',
      progress: 50,
      message: 'Drawing layers...'
    });
    
    // Draw all visible layers at time 0
    for (const layer of project.layers) {
      const asset = project.assets[layer.assetId];
      if (asset && layer.visible) {
        drawLayer(drawContext, layer, asset, 0);
      }
    }
    
    onProgress?.({
      stage: 'encoding',
      progress: 75,
      message: `Encoding ${format.toUpperCase()}...`
    });
    
    // Export based on format
    const blob = format === 'png' 
      ? await exportPNG(canvas, quality)
      : await exportJPEG(canvas, quality);
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Export complete!'
    });
    
    return blob;
  }

  /**
   * Export animated GIF
   */
  private async exportAnimatedGif(
    project: Project,
    width: number,
    height: number,
    fps: number,
    loopDurationMs: number,
    quality: number,
    transparency: boolean,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    onProgress?.({
      stage: 'rendering',
      progress: 10,
      message: 'Preparing GIF export...'
    });

    const background = transparency 
      ? { type: 'transparent' as const }
      : project.settings.background;

    const gifOptions = {
      width,
      height,
      fps,
      quality: Math.round(quality * 100),
      loopDurationMs,
      background
    };

    onProgress?.({
      stage: 'rendering',
      progress: 25,
      message: 'Rendering frames...'
    });

    try {
      // Use the existing GIF export function
      const blob = await exportGif(
        project.layers,
        project.assets,
        gifOptions
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'GIF export complete!'
      });

      return blob;
    } catch (error) {
      throw new Error(`GIF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export WebM video
   */
  private async exportWebMVideo(
    project: Project,
    width: number,
    height: number,
    fps: number,
    loopDurationMs: number,
    transparency: boolean,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    if (!supportsWebMRecording()) {
      throw new Error('WebM recording is not supported in this browser');
    }

    onProgress?.({
      stage: 'preparing',
      progress: 10,
      message: 'Setting up video recording...'
    });

    // Create a visible canvas for MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    const drawContext = { ctx, width, height };
    
    onProgress?.({
      stage: 'rendering',
      progress: 25,
      message: 'Starting video recording...'
    });

    const background = transparency 
      ? { type: 'transparent' as const }
      : project.settings.background;

    // Start MediaRecorder first
    const recordingPromise = exportWebM(canvas, {
      width,
      height,
      fps,
      videoBitsPerSecond: 2500000,
      loopDurationMs,
      background
    });

    // Animation loop that runs in sync with MediaRecorder
    const frameCount = Math.ceil((loopDurationMs / 1000) * fps);
    let currentFrame = 0;
    let animationStart = performance.now();
    
    const animate = async () => {
      const elapsed = performance.now() - animationStart;
      const currentTime = (elapsed % loopDurationMs);
      
      // Clear and draw frame
      clearCanvas(drawContext, background);
      
      for (const layer of project.layers) {
        const asset = project.assets[layer.assetId];
        if (asset && layer.visible) {
          await drawLayerAsync(drawContext, layer, asset, currentTime);
        }
      }
      
      currentFrame++;
      
      // Update progress
      const progress = 25 + Math.min((elapsed / loopDurationMs) * 50, 50);
      onProgress?.({
        stage: 'rendering',
        progress: Math.min(progress, 75),
        message: `Recording frame ${currentFrame}/${frameCount}...`
      });
      
      // Continue animation until recording stops
      if (elapsed < loopDurationMs + 100) { // Small buffer
        requestAnimationFrame(animate);
      }
    };

    // Start animation
    requestAnimationFrame(animate);

    onProgress?.({
      stage: 'encoding',
      progress: 80,
      message: 'Encoding video...'
    });

    try {
      const blob = await recordingPromise;

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'WebM export complete!'
      });

      return blob;
    } catch (error) {
      throw new Error(`WebM export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate the loop duration for a project
   */
  private calculateLoopDuration(project: Project): number {
    if (project.settings.loopDurationMs !== 'auto') {
      return project.settings.loopDurationMs;
    }

    // Find maximum duration from animated assets
    let maxDuration = 5000; // Default 5 seconds
    
    for (const layer of project.layers) {
      const asset = project.assets[layer.assetId];
      if (!asset || !layer.visible) continue;
      
      if (asset.kind === 'gif') {
        maxDuration = Math.max(maxDuration, asset.totalDurationMs);
      } else if (asset.kind === 'video') {
        maxDuration = Math.max(maxDuration, asset.durationMs);
      }
    }
    
    return maxDuration;
  }

  /**
   * Get available export formats based on browser capabilities
   */
  getAvailableFormats(): string[] {
    const formats = ['png', 'jpeg', 'gif'];
    
    if (supportsWebMRecording()) {
      formats.push('webm');
    }
    
    return formats;
  }

  /**
   * Check if a format supports transparency
   */
  supportsTransparency(format: string): boolean {
    return ['png', 'gif', 'webm'].includes(format);
  }

  /**
   * Get recommended settings for a format
   */
  getRecommendedSettings(format: string, project: Project) {
    const base = {
      width: project.settings.width,
      height: project.settings.height,
      fps: project.settings.fps,
      quality: 0.9,
      transparency: false,
      loopDurationMs: this.calculateLoopDuration(project)
    };

    switch (format) {
      case 'png':
        return { ...base, quality: 1.0, transparency: true };
      case 'jpeg':
        return { ...base, quality: 0.9, transparency: false };
      case 'gif':
        return { ...base, quality: 0.8, transparency: true, fps: Math.min(base.fps, 15) };
      case 'webm':
        return { ...base, quality: 0.9, transparency: false };
      default:
        return base;
    }
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance();