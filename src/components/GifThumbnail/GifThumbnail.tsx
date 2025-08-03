import React, { useEffect, useRef, useState } from 'react';
import type { GifAsset } from '../../types';
import { getFrameAtTime } from '../../lib/gif/decode';
import './GifThumbnail.css';

interface GifThumbnailProps {
  asset: GifAsset;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  size?: number;
}

export function GifThumbnail({ 
  asset, 
  className = '', 
  showControls = true, 
  autoPlay = true,
  size = 48
}: GifThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !asset.frames.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Calculate scale to fit the GIF maintaining aspect ratio
    const scale = Math.min(size / asset.width, size / asset.height);
    const scaledWidth = asset.width * scale;
    const scaledHeight = asset.height * scale;
    const offsetX = (size - scaledWidth) / 2;
    const offsetY = (size - scaledHeight) / 2;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const time = isPlaying ? elapsed : currentTime;
      
      // Get the frame for current time
      const frame = getFrameAtTime(asset, time);
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, size, size);
      
      // Draw frame scaled to fit canvas
      ctx.drawImage(frame.bitmap, offsetX, offsetY, scaledWidth, scaledHeight);
      
      if (isPlaying) {
        setCurrentTime(time);
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      startTimeRef.current = performance.now() - currentTime;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Draw current frame when paused
      const frame = getFrameAtTime(asset, currentTime);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(frame.bitmap, offsetX, offsetY, scaledWidth, scaledHeight);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [asset, isPlaying, currentTime, size]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      startTimeRef.current = 0;
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTime(0);
    setIsPlaying(false);
    startTimeRef.current = 0;
  };

  return (
    <div className={`gif-thumbnail ${className}`}>
      <canvas 
        ref={canvasRef}
        className="gif-canvas"
        style={{ width: size, height: size }}
      />
      
      {showControls && (
        <div className="gif-controls">
          <button 
            className="gif-control-btn play-pause"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className="gif-control-btn reset"
            onClick={handleReset}
            title="Reset"
          >
            ⏹
          </button>
        </div>
      )}
      
      <div className="gif-info">
        <div className="gif-badge">
          <span>GIF</span>
          <span className="frame-count">{asset.frames.length}f</span>
        </div>
        <div className="gif-duration">
          {(asset.totalDurationMs / 1000).toFixed(1)}s
        </div>
      </div>
    </div>
  );
}