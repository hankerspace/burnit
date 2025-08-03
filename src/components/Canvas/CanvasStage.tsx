import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../../state';
import { clearCanvas, drawLayer, drawGrid, drawSelectionHandles } from '../../lib/canvas/draw';
import type { Layer, Asset } from '../../types';
import './CanvasStage.css';

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  
  // Drag state
  const dragStateRef = useRef<{
    isDragging: boolean;
    isResizing: boolean;
    draggedLayerId: string | null;
    resizeHandle: string | null;
    startX: number;
    startY: number;
    initialTransform: { x: number; y: number; scaleX: number; scaleY: number } | null;
  }>({
    isDragging: false,
    isResizing: false,
    draggedLayerId: null,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    initialTransform: null
  });
  
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

  // Helper function to check if a point is within a layer's bounds
  const isPointInLayer = useCallback((
    x: number, 
    y: number, 
    layer: Layer, 
    asset: Asset
  ): boolean => {
    if (!layer.visible || layer.transform.opacity <= 0) {
      return false;
    }

    const { transform } = layer;
    
    // Calculate the layer's bounding box (assets are drawn centered)
    const halfWidth = (asset.width * transform.scaleX) / 2;
    const halfHeight = (asset.height * transform.scaleY) / 2;
    
    // For simplicity, we'll do basic bounds checking without rotation
    // In a more complex implementation, we'd need to handle rotation properly
    const layerLeft = transform.x - halfWidth;
    const layerRight = transform.x + halfWidth;
    const layerTop = transform.y - halfHeight;
    const layerBottom = transform.y + halfHeight;
    
    return x >= layerLeft && x <= layerRight && y >= layerTop && y <= layerBottom;
  }, []);

  // Helper function to check if a point is on a resize handle
  const getResizeHandle = useCallback((
    x: number,
    y: number,
    layer: Layer,
    asset: Asset
  ): string | null => {
    if (!layer.visible || layer.transform.opacity <= 0) {
      return null;
    }

    const { transform } = layer;
    const handleSize = 8; // Same as in drawSelectionHandles
    const halfHandleSize = handleSize / 2;
    
    // Calculate the layer's bounding box
    const halfWidth = (asset.width * transform.scaleX) / 2;
    const halfHeight = (asset.height * transform.scaleY) / 2;
    
    // Handle positions (same as in drawSelectionHandles)
    const handlePositions = [
      { name: 'top-left', x: transform.x - halfWidth, y: transform.y - halfHeight },
      { name: 'top-center', x: transform.x, y: transform.y - halfHeight },
      { name: 'top-right', x: transform.x + halfWidth, y: transform.y - halfHeight },
      { name: 'center-right', x: transform.x + halfWidth, y: transform.y },
      { name: 'bottom-right', x: transform.x + halfWidth, y: transform.y + halfHeight },
      { name: 'bottom-center', x: transform.x, y: transform.y + halfHeight },
      { name: 'bottom-left', x: transform.x - halfWidth, y: transform.y + halfHeight },
      { name: 'center-left', x: transform.x - halfWidth, y: transform.y }
    ];
    
    // Check if click is within any handle
    for (const handle of handlePositions) {
      if (x >= handle.x - halfHandleSize && x <= handle.x + halfHandleSize &&
          y >= handle.y - halfHandleSize && y <= handle.y + halfHandleSize) {
        return handle.name;
      }
    }
    
    return null;
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || !currentProject) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = currentProject.settings.width / rect.width;
    const scaleY = currentProject.settings.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, [currentProject]);

  // Handle mouse down - start drag or select
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !currentProject) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    // First check if we're clicking on a resize handle of a selected layer
    const { layers, assets } = currentProject;
    for (const layerId of canvasState.selectedLayerIds) {
      const layer = layers.find(l => l.id === layerId);
      const asset = layer ? assets[layer.assetId] : null;
      
      if (layer && asset && !layer.locked) {
        const resizeHandle = getResizeHandle(x, y, layer, asset);
        if (resizeHandle) {
          // Start resizing
          dragStateRef.current = {
            isDragging: false,
            isResizing: true,
            draggedLayerId: layerId,
            resizeHandle,
            startX: x,
            startY: y,
            initialTransform: { 
              x: layer.transform.x, 
              y: layer.transform.y,
              scaleX: layer.transform.scaleX,
              scaleY: layer.transform.scaleY
            }
          };
          return;
        }
      }
    }
    
    // Find the topmost layer under the click
    let selectedLayerId: string | null = null;
    
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const asset = assets[layer.assetId];
      
      if (asset && isPointInLayer(x, y, layer, asset)) {
        selectedLayerId = layer.id;
        break;
      }
    }
    
    if (selectedLayerId) {
      // Select the layer if not already selected
      if (!canvasState.selectedLayerIds.includes(selectedLayerId)) {
        useAppStore.getState().selectLayer(selectedLayerId);
      }
      
      // Start dragging
      const layer = layers.find(l => l.id === selectedLayerId);
      if (layer && !layer.locked) {
        dragStateRef.current = {
          isDragging: true,
          isResizing: false,
          draggedLayerId: selectedLayerId,
          resizeHandle: null,
          startX: x,
          startY: y,
          initialTransform: { 
            x: layer.transform.x, 
            y: layer.transform.y,
            scaleX: layer.transform.scaleX,
            scaleY: layer.transform.scaleY
          }
        };
      }
    } else {
      // Deselect all layers
      useAppStore.getState().deselectLayers();
    }
  }, [currentProject, isPointInLayer, getResizeHandle, canvasState.selectedLayerIds, screenToCanvas]);

  // Handle mouse move - drag or resize selected layer
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if ((!dragStateRef.current.isDragging && !dragStateRef.current.isResizing) || 
        !dragStateRef.current.draggedLayerId || 
        !dragStateRef.current.initialTransform) {
      return;
    }
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    if (dragStateRef.current.isResizing && dragStateRef.current.resizeHandle) {
      // Handle resizing
      const deltaX = x - dragStateRef.current.startX;
      const deltaY = y - dragStateRef.current.startY;
      
      const { initialTransform, resizeHandle } = dragStateRef.current;
      let newScaleX = initialTransform.scaleX;
      let newScaleY = initialTransform.scaleY;
      let newX = initialTransform.x;
      let newY = initialTransform.y;
      
      // Get the current layer and asset for calculations
      const currentLayer = currentProject?.layers.find(l => l.id === dragStateRef.current.draggedLayerId);
      const currentAsset = currentLayer ? currentProject?.assets[currentLayer.assetId] : null;
      
      if (currentAsset) {
        const baseWidth = currentAsset.width;
        const baseHeight = currentAsset.height;
        
        // Calculate scale changes based on handle type
        switch (resizeHandle) {
          case 'top-left':
            newScaleX = Math.max(0.1, initialTransform.scaleX - (deltaX * 2) / baseWidth);
            newScaleY = Math.max(0.1, initialTransform.scaleY - (deltaY * 2) / baseHeight);
            newX = initialTransform.x + deltaX / 2;
            newY = initialTransform.y + deltaY / 2;
            break;
          case 'top-center':
            newScaleY = Math.max(0.1, initialTransform.scaleY - (deltaY * 2) / baseHeight);
            newY = initialTransform.y + deltaY / 2;
            break;
          case 'top-right':
            newScaleX = Math.max(0.1, initialTransform.scaleX + (deltaX * 2) / baseWidth);
            newScaleY = Math.max(0.1, initialTransform.scaleY - (deltaY * 2) / baseHeight);
            newX = initialTransform.x + deltaX / 2;
            newY = initialTransform.y + deltaY / 2;
            break;
          case 'center-right':
            newScaleX = Math.max(0.1, initialTransform.scaleX + (deltaX * 2) / baseWidth);
            newX = initialTransform.x + deltaX / 2;
            break;
          case 'bottom-right':
            newScaleX = Math.max(0.1, initialTransform.scaleX + (deltaX * 2) / baseWidth);
            newScaleY = Math.max(0.1, initialTransform.scaleY + (deltaY * 2) / baseHeight);
            newX = initialTransform.x + deltaX / 2;
            newY = initialTransform.y + deltaY / 2;
            break;
          case 'bottom-center':
            newScaleY = Math.max(0.1, initialTransform.scaleY + (deltaY * 2) / baseHeight);
            newY = initialTransform.y + deltaY / 2;
            break;
          case 'bottom-left':
            newScaleX = Math.max(0.1, initialTransform.scaleX - (deltaX * 2) / baseWidth);
            newScaleY = Math.max(0.1, initialTransform.scaleY + (deltaY * 2) / baseHeight);
            newX = initialTransform.x + deltaX / 2;
            newY = initialTransform.y + deltaY / 2;
            break;
          case 'center-left':
            newScaleX = Math.max(0.1, initialTransform.scaleX - (deltaX * 2) / baseWidth);
            newX = initialTransform.x + deltaX / 2;
            break;
        }
      }
      
      // Update layer transform
      useAppStore.getState().updateLayerTransform(dragStateRef.current.draggedLayerId, {
        x: newX,
        y: newY,
        scaleX: newScaleX,
        scaleY: newScaleY
      });
    } else if (dragStateRef.current.isDragging) {
      // Handle dragging (position change)
      const deltaX = x - dragStateRef.current.startX;
      const deltaY = y - dragStateRef.current.startY;
      
      const newX = dragStateRef.current.initialTransform.x + deltaX;
      const newY = dragStateRef.current.initialTransform.y + deltaY;
      
      // Update layer position
      useAppStore.getState().updateLayerTransform(dragStateRef.current.draggedLayerId, {
        x: newX,
        y: newY
      });
    }
  }, [screenToCanvas, currentProject]);

  // Handle mouse up - end drag or resize
  const handleMouseUp = useCallback(() => {
    dragStateRef.current = {
      isDragging: false,
      isResizing: false,
      draggedLayerId: null,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      initialTransform: null
    };
  }, []);

  // Handle canvas click (for compatibility)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Click is handled by mouseDown, but we keep this for any future click-specific logic
  }, []);

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
            height: canvasSize.height,
            cursor: dragStateRef.current.isDragging ? 'grabbing' : 
                   dragStateRef.current.isResizing ? 
                     (dragStateRef.current.resizeHandle?.includes('top-left') || dragStateRef.current.resizeHandle?.includes('bottom-right') ? 'nw-resize' :
                      dragStateRef.current.resizeHandle?.includes('top-right') || dragStateRef.current.resizeHandle?.includes('bottom-left') ? 'ne-resize' :
                      dragStateRef.current.resizeHandle?.includes('top-center') || dragStateRef.current.resizeHandle?.includes('bottom-center') ? 'n-resize' :
                      dragStateRef.current.resizeHandle?.includes('center-left') || dragStateRef.current.resizeHandle?.includes('center-right') ? 'e-resize' : 'grab') : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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