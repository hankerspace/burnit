import React, { useCallback, useRef, useState } from 'react';
import { useAppStore } from '../../state';
import { formatTime } from '../../utils/time';
import './Timeline.css';

export function Timeline() {
  const currentProject = useAppStore((state) => state.currentProject);
  const timeline = useAppStore((state) => state.timeline);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const play = useAppStore((state) => state.play);
  const pause = useAppStore((state) => state.pause);
  const stop = useAppStore((state) => state.stop);
  const setSpeed = useAppStore((state) => state.setSpeed);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate total duration
  const totalDuration = React.useMemo(() => {
    if (!currentProject) return 5000; // Default 5 seconds

    if (currentProject.settings.loopDurationMs !== 'auto') {
      return currentProject.settings.loopDurationMs;
    }

    // Find max duration of animated assets
    const animatedAssets = Object.values(currentProject.assets).filter(
      (asset) => asset.kind === 'gif' || asset.kind === 'video'
    );

    if (animatedAssets.length === 0) return 5000;

    return Math.max(
      ...animatedAssets.map((asset) =>
        asset.kind === 'gif' ? asset.totalDurationMs : asset.durationMs
      )
    );
  }, [currentProject]);

  // Handle playhead dragging
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const progress = Math.max(0, Math.min(1, x / width));
      const newTime = progress * totalDuration;

      setCurrentTime(newTime);
    },
    [totalDuration, setCurrentTime]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleTimelineClick(e);
    },
    [handleTimelineClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        handleTimelineClick(e);
      }
    },
    [isDragging, handleTimelineClick]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (timeline.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [timeline.isPlaying, play, pause]);

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSpeed(parseFloat(e.target.value));
    },
    [setSpeed]
  );

  // Calculate playhead position
  const playheadPosition = (timeline.currentTime / totalDuration) * 100;

  if (!currentProject) {
    return (
      <div className="timeline">
        <div className="timeline-content">
          <p className="text-muted">No project loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div className="timeline-controls">
          <button className="btn btn-icon" onClick={stop} title="Stop">
            ⏹
          </button>

          <button
            className="btn btn-icon btn-primary"
            onClick={handlePlayPause}
            title={timeline.isPlaying ? 'Pause' : 'Play'}
          >
            {timeline.isPlaying ? '⏸' : '▶'}
          </button>

          <div className="timeline-info">
            <span className="time-display">
              {formatTime(timeline.currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        <div className="timeline-settings">
          <div className="speed-control">
            <label className="text-xs text-muted">Speed:</label>
            <select className="input text-xs" value={timeline.speed} onChange={handleSpeedChange}>
              <option value="0.25">0.25×</option>
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2×</option>
            </select>
          </div>

          <div className="fps-display">
            <span className="text-xs text-muted">{currentProject.settings.fps} FPS</span>
          </div>
        </div>
      </div>

      <div className="timeline-content">
        <div
          ref={timelineRef}
          className="timeline-track"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Timeline background */}
          <div className="timeline-background">
            {/* Time markers */}
            {Array.from({ length: 11 }, (_, i) => {
              const position = (i / 10) * 100;
              const time = (i / 10) * totalDuration;
              return (
                <div key={i} className="time-marker" style={{ left: `${position}%` }}>
                  <div className="time-label text-xs text-muted">{formatTime(time)}</div>
                </div>
              );
            })}
          </div>

          {/* Asset duration indicators */}
          <div className="asset-tracks">
            {Object.values(currentProject.assets).map((asset) => {
              if (asset.kind === 'image') return null;

              const duration = asset.kind === 'gif' ? asset.totalDurationMs : asset.durationMs;
              const width = Math.min(100, (duration / totalDuration) * 100);

              return (
                <div
                  key={asset.id}
                  className={`asset-track ${asset.kind}`}
                  style={{ width: `${width}%` }}
                  title={`${asset.name} (${formatTime(duration)})`}
                >
                  <span className="asset-track-label text-xs">{asset.name}</span>
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className={`playhead ${timeline.isPlaying ? 'playing' : ''}`}
            style={{ left: `${playheadPosition}%` }}
          >
            <div className="playhead-line"></div>
            <div className="playhead-handle"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
