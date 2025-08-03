import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../../state';
import { clearCanvas, drawLayer, drawGrid, drawSelectionHandles } from '../../lib/canvas/draw';
import './CanvasStage.css';

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  
  const currentProject = useAppStore((state) => state.currentProject);
  const timeline = useAppStore((state) => state.timeline);
  const canvasState = useAppStore((state) => state.canvas);
  const showGrid = useAppStore((state) => state.showGrid);
  const gridSize = useAppStore((state) => state.gridSize);
  
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Calculate canvas dimensions based on project settings and zoom
  const updateCanvasSize = useCallback(() => {
    if (!currentProject || !containerRef.current) return;
    
    const container = containerRef.current;
    const settings = currentProject.settings;
    
    // Calculate available space
    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 40; // padding
    const maxHeight = containerRect.height - 40;
    
    // Scale to fit while maintaining aspect ratio
    const aspectRatio = settings.width / settings.height;
    let width = Math.min(maxWidth, settings.width * canvasState.zoom);
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    setCanvasSize({ width, height });
  }, [currentProject, canvasState.zoom]);

  // Update canvas size when dependencies change
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // Render function
  const render = useCallback((currentTime: number) => {
    if (!canvasRef.current || !currentProject) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { settings, layers, assets } = currentProject;
    
    // Set canvas resolution to match project settings
    canvas.width = settings.width;
    canvas.height = settings.height;
    
    // Create draw context
    const drawContext = {
      ctx,
      width: settings.width,
      height: settings.height
    };
    
    // Clear canvas with background
    clearCanvas(drawContext, settings.background);
    
    // Draw grid if enabled
    if (showGrid) {
      drawGrid(drawContext, gridSize, 1, 0, 0); // No pan/zoom for now
    }
    
    // Draw layers in order
    for (const layer of layers) {
      const asset = assets[layer.assetId];
      if (asset) {
        drawLayer(drawContext, layer, asset, currentTime);
      }
    }
    
    // Draw selection handles for selected layers
    const selectedLayers = layers.filter(layer => 
      canvasState.selectedLayerIds.includes(layer.id)
    );
    
    for (const layer of selectedLayers) {
      const asset = assets[layer.assetId];
      if (asset) {
        drawSelectionHandles(drawContext, layer, asset, 1); // No zoom for now
      }
    }
  }, [currentProject, showGrid, gridSize, canvasState.selectedLayerIds]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!timeline.isPlaying) {
      render(timeline.currentTime);
      return;
    }
    
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // Update timeline
    const newTime = timeline.currentTime + (deltaTime * timeline.speed);
    
    // Handle looping
    let maxDuration = 5000; // Default 5 seconds
    if (currentProject) {
      const animatedAssets = Object.values(currentProject.assets).filter(
        asset => asset.kind === 'gif' || asset.kind === 'video'
      );
      
      if (animatedAssets.length > 0) {
        maxDuration = Math.max(
          ...animatedAssets.map(asset => 
            asset.kind === 'gif' ? asset.totalDurationMs : asset.durationMs
          )
        );
      }
      
      if (currentProject.settings.loopDurationMs !== 'auto') {
        maxDuration = currentProject.settings.loopDurationMs;
      }
    }
    
    const loopedTime = newTime % maxDuration;
    useAppStore.getState().setCurrentTime(loopedTime);
    
    render(loopedTime);
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [timeline, currentProject, render]);

  // Start animation when playing
  useEffect(() => {
    if (timeline.isPlaying) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      render(timeline.currentTime);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timeline.isPlaying, animate, render, timeline.currentTime]);

  // Handle canvas interactions
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !currentProject) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Convert screen coordinates to canvas coordinates
    const scaleX = currentProject.settings.width / rect.width;
    const scaleY = currentProject.settings.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    console.log('Canvas clicked at:', { x, y });
    
    // TODO: Implement layer selection based on click position
    useAppStore.getState().deselectLayers();
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="canvas-stage">
        <div className="canvas-placeholder">
          <p className="text-muted">No project loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-stage" ref={containerRef}>
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className="canvas"
          style={{
            width: canvasSize.width,
            height: canvasSize.height
          }}
          onClick={handleCanvasClick}
        />
        
        <div className="canvas-overlay">
          <div className="canvas-info">
            <span className="text-xs text-muted">
              {currentProject.settings.width} × {currentProject.settings.height}
              {' • '}
              {Math.round(canvasState.zoom * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}