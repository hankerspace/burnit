export type UUID = string;

export interface AssetBase {
  id: UUID;
  name: string;
  kind: 'image' | 'gif' | 'video';
  width: number;
  height: number;
  src: string; // Blob URL
}

export interface GifFrame {
  bitmap: ImageBitmap;
  durationMs: number;
}

export interface GifAsset extends AssetBase {
  kind: 'gif';
  frames: GifFrame[];
  totalDurationMs: number;
  customDurationMs?: number; // User-defined duration override
  loopCount?: number | 'infinite';
}

export interface ImageAsset extends AssetBase {
  kind: 'image';
  bitmap: ImageBitmap;
}

export interface VideoAsset extends AssetBase {
  kind: 'video'; // WebM
  durationMs: number;
  videoEl: HTMLVideoElement; // managed in a pool; not serialized
}

export type Asset = ImageAsset | GifAsset | VideoAsset;

export type BlendMode = 'normal';

export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  opacity: number;
}

export interface Layer {
  id: UUID;
  assetId: UUID;
  name: string;
  visible: boolean;
  locked: boolean;
  transform: LayerTransform;
  blendMode: BlendMode;
}

export interface CompositionSettings {
  width: number;
  height: number;
  fps: number;
  loopDurationMs: number | 'auto'; // 'auto' => max animated asset duration
  background: { type: 'transparent' | 'color'; color?: string };
}

export interface Project {
  id: UUID;
  name: string;
  assets: Record<UUID, Asset>;
  layers: Layer[]; // z-order
  settings: CompositionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'gif' | 'webm';
  width?: number;
  height?: number;
  fps?: number;
  quality?: number;
  transparency?: boolean;
  loopDurationMs?: number;
}

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  loopDurationMs: number;
  background: CompositionSettings['background'];
}

export interface TimelineState {
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  loopStartTime: number;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedLayerIds: UUID[];
}