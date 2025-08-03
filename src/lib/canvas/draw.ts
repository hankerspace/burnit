import type { Layer, LayerTransform, Asset, CompositionSettings } from '../../types';
import { degToRad } from '../../utils/math';

export interface DrawContext {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
}

export function clearCanvas(drawContext: DrawContext, background: CompositionSettings['background']): void {
  const { ctx, width, height } = drawContext;
  
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw background if specified
  if (background.type === 'color' && background.color) {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, width, height);
  }
}

export function drawLayer(
  drawContext: DrawContext,
  layer: Layer,
  asset: Asset,
  currentTimeMs: number = 0
): void {
  if (!layer.visible || layer.transform.opacity <= 0) {
    return;
  }

  const { ctx } = drawContext;
  
  // Save current context state
  ctx.save();
  
  // Apply layer transform
  applyTransform(ctx, layer.transform);
  
  // Apply opacity
  ctx.globalAlpha = layer.transform.opacity;
  
  // Apply blend mode (for now only 'normal' is supported)
  ctx.globalCompositeOperation = 'source-over';
  
  try {
    // Draw the asset based on its type
    switch (asset.kind) {
      case 'image':
        drawImageAsset(ctx, asset);
        break;
      case 'gif':
        drawGifAsset(ctx, asset, currentTimeMs);
        break;
      case 'video':
        drawVideoAsset(ctx, asset, currentTimeMs);
        break;
    }
  } catch (error) {
    console.warn('Error drawing layer:', error);
  }
  
  // Restore context state
  ctx.restore();
}

export async function drawLayerAsync(
  drawContext: DrawContext,
  layer: Layer,
  asset: Asset,
  currentTimeMs: number = 0
): Promise<void> {
  if (!layer.visible || layer.transform.opacity <= 0) {
    return;
  }

  const { ctx } = drawContext;
  
  // Save current context state
  ctx.save();
  
  // Apply layer transform
  applyTransform(ctx, layer.transform);
  
  // Apply opacity
  ctx.globalAlpha = layer.transform.opacity;
  
  // Apply blend mode (for now only 'normal' is supported)
  ctx.globalCompositeOperation = 'source-over';
  
  try {
    // Draw the asset based on its type
    switch (asset.kind) {
      case 'image':
        drawImageAsset(ctx, asset);
        break;
      case 'gif':
        drawGifAsset(ctx, asset, currentTimeMs);
        break;
      case 'video':
        await drawVideoAssetAsync(ctx, asset, currentTimeMs);
        break;
    }
  } catch (error) {
    console.warn('Error drawing layer:', error);
  }
  
  // Restore context state
  ctx.restore();
}

function drawVideoAsset(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  asset: Asset & { kind: 'video' },
  currentTimeMs: number
): void {
  if (!asset.videoEl) {
    return;
  }
  
  // Seek video to current time (modulo duration for looping)
  const loopTime = currentTimeMs % asset.durationMs;
  const targetTime = loopTime / 1000;
  
  // Always seek for exports to ensure frame accuracy
  asset.videoEl.currentTime = targetTime;
  
  // Draw video frame
  try {
    ctx.drawImage(
      asset.videoEl,
      -asset.width / 2,
      -asset.height / 2,
      asset.width,
      asset.height
    );
  } catch (error) {
    // Video might not be ready yet
    console.warn('Error drawing video frame:', error);
  }
}

async function drawVideoAssetAsync(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  asset: Asset & { kind: 'video' },
  currentTimeMs: number
): Promise<void> {
  if (!asset.videoEl) {
    return;
  }
  
  // Seek video to current time (modulo duration for looping)
  const loopTime = currentTimeMs % asset.durationMs;
  const targetTime = loopTime / 1000;
  
  // Set the time and wait for seek to complete
  return new Promise<void>((resolve) => {
    const onSeeked = () => {
      asset.videoEl!.removeEventListener('seeked', onSeeked);
      
      // Draw video frame
      try {
        ctx.drawImage(
          asset.videoEl!,
          -asset.width / 2,
          -asset.height / 2,
          asset.width,
          asset.height
        );
      } catch (error) {
        console.warn('Error drawing video frame:', error);
      }
      
      resolve();
    };
    
    // If we're already at the right time, draw immediately
    if (Math.abs(asset.videoEl.currentTime - targetTime) < 0.1) {
      onSeeked();
      return;
    }
    
    asset.videoEl.addEventListener('seeked', onSeeked, { once: true });
    asset.videoEl.currentTime = targetTime;
    
    // Fallback timeout to prevent hanging
    setTimeout(() => {
      asset.videoEl!.removeEventListener('seeked', onSeeked);
      resolve();
    }, 1000);
  });
}

function applyTransform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  transform: LayerTransform
): void {
  // Apply translation
  ctx.translate(transform.x, transform.y);
  
  // Apply rotation
  if (transform.rotationDeg !== 0) {
    ctx.rotate(degToRad(transform.rotationDeg));
  }
  
  // Apply scale
  if (transform.scaleX !== 1 || transform.scaleY !== 1) {
    ctx.scale(transform.scaleX, transform.scaleY);
  }
}

function drawImageAsset(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  asset: Asset & { kind: 'image' }
): void {
  if (!asset.bitmap) {
    return;
  }
  
  // Draw centered
  ctx.drawImage(
    asset.bitmap,
    -asset.width / 2,
    -asset.height / 2,
    asset.width,
    asset.height
  );
}

function drawGifAsset(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  asset: Asset & { kind: 'gif' },
  currentTimeMs: number
): void {
  if (!asset.frames || asset.frames.length === 0) {
    return;
  }
  
  // Find the current frame based on time
  const loopTime = currentTimeMs % asset.totalDurationMs;
  let accumulatedTime = 0;
  let currentFrame = asset.frames[0];
  
  for (const frame of asset.frames) {
    accumulatedTime += frame.durationMs;
    if (loopTime < accumulatedTime) {
      currentFrame = frame;
      break;
    }
  }
  
  if (currentFrame.bitmap) {
    ctx.drawImage(
      currentFrame.bitmap,
      -asset.width / 2,
      -asset.height / 2,
      asset.width,
      asset.height
    );
  }
}

export function drawGrid(
  drawContext: DrawContext,
  gridSize: number,
  zoom: number,
  panX: number,
  panY: number
): void {
  const { ctx, width, height } = drawContext;
  
  ctx.save();
  
  // Set grid style
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1 / zoom;
  
  // Calculate visible grid range
  const scaledGridSize = gridSize * zoom;
  const startX = Math.floor(-panX / scaledGridSize) * scaledGridSize;
  const startY = Math.floor(-panY / scaledGridSize) * scaledGridSize;
  const endX = startX + width + scaledGridSize;
  const endY = startY + height + scaledGridSize;
  
  // Draw vertical lines
  ctx.beginPath();
  for (let x = startX; x <= endX; x += scaledGridSize) {
    const screenX = x + panX;
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, height);
  }
  ctx.stroke();
  
  // Draw horizontal lines
  ctx.beginPath();
  for (let y = startY; y <= endY; y += scaledGridSize) {
    const screenY = y + panY;
    ctx.moveTo(0, screenY);
    ctx.lineTo(width, screenY);
  }
  ctx.stroke();
  
  ctx.restore();
}

export function drawSelectionHandles(
  drawContext: DrawContext,
  layer: Layer,
  asset: Asset,
  zoom: number
): void {
  const { ctx } = drawContext;
  const { transform } = layer;
  
  ctx.save();
  
  // Apply transform to get the bounds
  ctx.translate(transform.x, transform.y);
  ctx.rotate(degToRad(transform.rotationDeg));
  ctx.scale(transform.scaleX, transform.scaleY);
  
  const halfWidth = asset.width / 2;
  const halfHeight = asset.height / 2;
  
  // Draw selection outline
  ctx.strokeStyle = '#ff6b35'; // Fire color
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  ctx.strokeRect(-halfWidth, -halfHeight, asset.width, asset.height);
  
  // Draw handles
  ctx.fillStyle = '#ff6b35';
  ctx.setLineDash([]);
  const handleSize = 8 / zoom;
  const handlePositions = [
    [-halfWidth, -halfHeight], // Top-left
    [0, -halfHeight],          // Top-center
    [halfWidth, -halfHeight],  // Top-right
    [halfWidth, 0],            // Center-right
    [halfWidth, halfHeight],   // Bottom-right
    [0, halfHeight],           // Bottom-center
    [-halfWidth, halfHeight],  // Bottom-left
    [-halfWidth, 0]            // Center-left
  ];
  
  handlePositions.forEach(([x, y]) => {
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
  });
  
  ctx.restore();
}

export function createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  
  // Fallback to regular canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getCanvasContext(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  return canvas.getContext('2d');
}