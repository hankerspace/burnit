// Test setup file
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: vi.fn(),
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
});

// Mock HTMLVideoElement
global.HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
global.HTMLVideoElement.prototype.pause = vi.fn();
global.HTMLVideoElement.prototype.load = vi.fn();

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  setLineDash: vi.fn(),
};

global.HTMLCanvasElement.prototype.getContext = vi.fn(
  () => mockContext
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock OffscreenCanvas if not available
if (typeof OffscreenCanvas === 'undefined') {
  global.OffscreenCanvas = class MockOffscreenCanvas {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    getContext() {
      return mockContext;
    }
  } as typeof OffscreenCanvas;
}
