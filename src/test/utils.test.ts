import { describe, it, expect } from 'vitest';
import { generateId, isValidUUID } from '../utils/id';
import { clamp, lerp, degToRad, radToDeg } from '../utils/math';
import { formatTime, parseTime, timeToFrame, frameToTime } from '../utils/time';
import { 
  getFileExtension, 
  isImageFile, 
  isGifFile, 
  isVideoFile, 
  formatFileSize 
} from '../utils/file';

describe('Utility Functions', () => {
  describe('ID Utils', () => {
    it('should generate valid UUIDs', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(isValidUUID(id)).toBe(true);
    });

    it('should validate UUID format', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('Math Utils', () => {
    it('should clamp values correctly', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should interpolate values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('should convert degrees to radians', () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
    });

    it('should convert radians to degrees', () => {
      expect(radToDeg(0)).toBe(0);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(Math.PI * 2)).toBeCloseTo(360);
    });
  });

  describe('Time Utils', () => {
    it('should format time correctly', () => {
      expect(formatTime(0)).toBe('0.0s');
      expect(formatTime(1000)).toBe('1.0s');
      expect(formatTime(1500)).toBe('1.5s');
      expect(formatTime(60000)).toBe('1:00.0');
      expect(formatTime(90500)).toBe('1:30.5');
    });

    it('should parse time strings', () => {
      expect(parseTime('0.0s')).toBe(0);
      expect(parseTime('1.5s')).toBe(1500);
      expect(parseTime('1:30.0')).toBe(90000);
      expect(parseTime('invalid')).toBe(0);
    });

    it('should convert time to frame numbers', () => {
      expect(timeToFrame(0, 30)).toBe(0);
      expect(timeToFrame(1000, 30)).toBe(30);
      expect(timeToFrame(1500, 30)).toBe(45);
    });

    it('should convert frame numbers to time', () => {
      expect(frameToTime(0, 30)).toBe(0);
      expect(frameToTime(30, 30)).toBe(1000);
      expect(frameToTime(45, 30)).toBe(1500);
    });
  });

  describe('File Utils', () => {
    it('should extract file extensions', () => {
      expect(getFileExtension('test.png')).toBe('png');
      expect(getFileExtension('test.file.gif')).toBe('gif');
      expect(getFileExtension('noextension')).toBe('');
    });

    it('should identify image files', () => {
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      expect(isImageFile(pngFile)).toBe(true);
      expect(isImageFile(jpegFile)).toBe(true);
      expect(isImageFile(textFile)).toBe(false);
    });

    it('should identify GIF files', () => {
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      
      expect(isGifFile(gifFile)).toBe(true);
      expect(isGifFile(pngFile)).toBe(false);
    });

    it('should identify video files', () => {
      const webmFile = new File([''], 'test.webm', { type: 'video/webm' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      
      expect(isVideoFile(webmFile)).toBe(true);
      expect(isVideoFile(pngFile)).toBe(false);
    });

    it('should format file sizes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB'); // Test decimal
    });
  });
});