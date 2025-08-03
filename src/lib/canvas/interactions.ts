import type { Layer, LayerTransform, Asset, UUID } from '../../types';
import { degToRad, radToDeg } from '../../utils/math';

export interface CanvasInteraction {
  type: 'select' | 'move' | 'resize' | 'rotate';
  layerId: UUID | null;
  startPoint: { x: number; y: number };
  currentPoint: { x: number; y: number };
  startTransform?: LayerTransform;
  handle?: ResizeHandle;
}

export type ResizeHandle = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-right' | 'bottom-right' | 'bottom-center'
  | 'bottom-left' | 'center-left';

export interface CanvasPoint {
  x: number;
  y: number;
}

/**
 * Convert screen coordinates to canvas coordinates
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  panX: number,
  panY: number
): CanvasPoint {
  // Convert screen to display canvas coordinates
  const displayX = screenX - canvasRect.left;
  const displayY = screenY - canvasRect.top;
  
  // Scale to actual canvas coordinates
  const scaleX = canvasWidth / canvasRect.width;
  const scaleY = canvasHeight / canvasRect.height;
  
  // Apply zoom and pan
  const canvasX = (displayX * scaleX - panX) / zoom;
  const canvasY = (displayY * scaleY - panY) / zoom;
  
  return { x: canvasX, y: canvasY };
}

/**
 * Check if a point is inside a layer's bounds
 */
export function isPointInLayer(
  point: CanvasPoint,
  layer: Layer,
  asset: Asset
): boolean {
  const { transform } = layer;
  
  // Transform point to layer's local space
  const localPoint = transformPointToLocal(point, transform);
  
  // Check if point is within asset bounds (centered)
  const halfWidth = asset.width / 2;
  const halfHeight = asset.height / 2;
  
  return (
    localPoint.x >= -halfWidth &&
    localPoint.x <= halfWidth &&
    localPoint.y >= -halfHeight &&
    localPoint.y <= halfHeight
  );
}

/**
 * Transform a point from world space to layer's local space
 */
function transformPointToLocal(
  point: CanvasPoint,
  transform: LayerTransform
): CanvasPoint {
  // Translate to origin
  let x = point.x - transform.x;
  let y = point.y - transform.y;
  
  // Apply inverse rotation
  if (transform.rotationDeg !== 0) {
    const angle = -degToRad(transform.rotationDeg);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    x = rotatedX;
    y = rotatedY;
  }
  
  // Apply inverse scale
  x /= transform.scaleX;
  y /= transform.scaleY;
  
  return { x, y };
}

/**
 * Get the resize handle at a point, if any
 */
export function getResizeHandleAtPoint(
  point: CanvasPoint,
  layer: Layer,
  asset: Asset,
  zoom: number
): ResizeHandle | null {
  const { transform } = layer;
  const handleSize = 8 / zoom;
  const tolerance = handleSize;
  
  // Transform point to layer space but don't apply scale (handles are in world space)
  let x = point.x - transform.x;
  let y = point.y - transform.y;
  
  // Apply inverse rotation
  if (transform.rotationDeg !== 0) {
    const angle = -degToRad(transform.rotationDeg);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    x = rotatedX;
    y = rotatedY;
  }
  
  // Scale by the layer's scale to get handle positions
  const scaledWidth = asset.width * transform.scaleX;
  const scaledHeight = asset.height * transform.scaleY;
  const halfWidth = scaledWidth / 2;
  const halfHeight = scaledHeight / 2;
  
  const handles = [
    { name: 'top-left' as ResizeHandle, x: -halfWidth, y: -halfHeight },
    { name: 'top-center' as ResizeHandle, x: 0, y: -halfHeight },
    { name: 'top-right' as ResizeHandle, x: halfWidth, y: -halfHeight },
    { name: 'center-right' as ResizeHandle, x: halfWidth, y: 0 },
    { name: 'bottom-right' as ResizeHandle, x: halfWidth, y: halfHeight },
    { name: 'bottom-center' as ResizeHandle, x: 0, y: halfHeight },
    { name: 'bottom-left' as ResizeHandle, x: -halfWidth, y: halfHeight },
    { name: 'center-left' as ResizeHandle, x: -halfWidth, y: 0 }
  ];
  
  for (const handle of handles) {
    const distance = Math.sqrt(
      Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2)
    );
    
    if (distance <= tolerance) {
      return handle.name;
    }
  }
  
  return null;
}

/**
 * Apply a move transformation to a layer
 */
export function applyMoveTransform(
  startTransform: LayerTransform,
  startPoint: CanvasPoint,
  currentPoint: CanvasPoint
): LayerTransform {
  const deltaX = currentPoint.x - startPoint.x;
  const deltaY = currentPoint.y - startPoint.y;
  
  return {
    ...startTransform,
    x: startTransform.x + deltaX,
    y: startTransform.y + deltaY
  };
}

/**
 * Apply a resize transformation to a layer
 */
export function applyResizeTransform(
  startTransform: LayerTransform,
  startPoint: CanvasPoint,
  currentPoint: CanvasPoint,
  handle: ResizeHandle,
  asset: Asset,
  maintainAspectRatio: boolean = false
): LayerTransform {
  const deltaX = currentPoint.x - startPoint.x;
  const deltaY = currentPoint.y - startPoint.y;
  
  let newScaleX = startTransform.scaleX;
  let newScaleY = startTransform.scaleY;
  let newX = startTransform.x;
  let newY = startTransform.y;
  
  // Calculate scale changes based on handle
  // Apply rotation to deltas if layer is rotated
  let adjustedDeltaX = deltaX;
  let adjustedDeltaY = deltaY;
  
  if (startTransform.rotationDeg !== 0) {
    const angle = degToRad(startTransform.rotationDeg);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    adjustedDeltaX = deltaX * cos + deltaY * sin;
    adjustedDeltaY = -deltaX * sin + deltaY * cos;
  }
  
  switch (handle) {
    case 'top-left':
      newScaleX = Math.max(0.1, startTransform.scaleX - (adjustedDeltaX * 2) / asset.width);
      newScaleY = Math.max(0.1, startTransform.scaleY - (adjustedDeltaY * 2) / asset.height);
      newX = startTransform.x + adjustedDeltaX / 2;
      newY = startTransform.y + adjustedDeltaY / 2;
      break;
      
    case 'top-center':
      newScaleY = Math.max(0.1, startTransform.scaleY - (adjustedDeltaY * 2) / asset.height);
      newY = startTransform.y + adjustedDeltaY / 2;
      break;
      
    case 'top-right':
      newScaleX = Math.max(0.1, startTransform.scaleX + (adjustedDeltaX * 2) / asset.width);
      newScaleY = Math.max(0.1, startTransform.scaleY - (adjustedDeltaY * 2) / asset.height);
      newX = startTransform.x + adjustedDeltaX / 2;
      newY = startTransform.y + adjustedDeltaY / 2;
      break;
      
    case 'center-right':
      newScaleX = Math.max(0.1, startTransform.scaleX + (adjustedDeltaX * 2) / asset.width);
      newX = startTransform.x + adjustedDeltaX / 2;
      break;
      
    case 'bottom-right':
      newScaleX = Math.max(0.1, startTransform.scaleX + (adjustedDeltaX * 2) / asset.width);
      newScaleY = Math.max(0.1, startTransform.scaleY + (adjustedDeltaY * 2) / asset.height);
      newX = startTransform.x + adjustedDeltaX / 2;
      newY = startTransform.y + adjustedDeltaY / 2;
      break;
      
    case 'bottom-center':
      newScaleY = Math.max(0.1, startTransform.scaleY + (adjustedDeltaY * 2) / asset.height);
      newY = startTransform.y + adjustedDeltaY / 2;
      break;
      
    case 'bottom-left':
      newScaleX = Math.max(0.1, startTransform.scaleX - (adjustedDeltaX * 2) / asset.width);
      newScaleY = Math.max(0.1, startTransform.scaleY + (adjustedDeltaY * 2) / asset.height);
      newX = startTransform.x + adjustedDeltaX / 2;
      newY = startTransform.y + adjustedDeltaY / 2;
      break;
      
    case 'center-left':
      newScaleX = Math.max(0.1, startTransform.scaleX - (adjustedDeltaX * 2) / asset.width);
      newX = startTransform.x + adjustedDeltaX / 2;
      break;
  }
  
  // Maintain aspect ratio if requested
  if (maintainAspectRatio) {
    const aspectRatio = asset.width / asset.height;
    if (handle.includes('left') || handle.includes('right')) {
      // Horizontal handles - adjust height to match width
      newScaleY = newScaleX / aspectRatio * (asset.width / asset.height);
    } else {
      // Vertical handles - adjust width to match height
      newScaleX = newScaleY * aspectRatio * (asset.height / asset.width);
    }
  }
  
  return {
    ...startTransform,
    scaleX: newScaleX,
    scaleY: newScaleY,
    x: newX,
    y: newY
  };
}

/**
 * Apply a rotation transformation to a layer
 */
export function applyRotationTransform(
  startTransform: LayerTransform,
  startPoint: CanvasPoint,
  currentPoint: CanvasPoint,
  layerCenter: CanvasPoint
): LayerTransform {
  // Calculate angles from layer center
  const startAngle = Math.atan2(
    startPoint.y - layerCenter.y,
    startPoint.x - layerCenter.x
  );
  
  const currentAngle = Math.atan2(
    currentPoint.y - layerCenter.y,
    currentPoint.x - layerCenter.x
  );
  
  const deltaAngle = currentAngle - startAngle;
  const newRotation = startTransform.rotationDeg + radToDeg(deltaAngle);
  
  return {
    ...startTransform,
    rotationDeg: newRotation % 360
  };
}

/**
 * Find the topmost layer at a given point
 */
export function findLayerAtPoint(
  point: CanvasPoint,
  layers: Layer[],
  assets: Record<string, Asset>
): Layer | null {
  // Check layers in reverse order (topmost first)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const asset = assets[layer.assetId];
    
    if (!layer.visible || !asset) continue;
    
    if (isPointInLayer(point, layer, asset)) {
      return layer;
    }
  }
  
  return null;
}

/**
 * Get cursor style for interaction type
 */
export function getCursorForInteraction(
  interactionType: 'select' | 'move' | 'resize' | 'rotate',
  handle?: ResizeHandle
): string {
  switch (interactionType) {
    case 'move':
      return 'move';
    case 'rotate':
      return 'crosshair';
    case 'resize':
      switch (handle) {
        case 'top-left':
        case 'bottom-right':
          return 'nw-resize';
        case 'top-right':
        case 'bottom-left':
          return 'ne-resize';
        case 'top-center':
        case 'bottom-center':
          return 'n-resize';
        case 'center-left':
        case 'center-right':
          return 'e-resize';
        default:
          return 'pointer';
      }
    default:
      return 'default';
  }
}