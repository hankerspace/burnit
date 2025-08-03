import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../../state';
import { clearCanvas, drawLayer, drawGrid, drawSelectionHandles } from '../../lib/canvas/draw';
import {
  screenToCanvas,
  findLayerAtPoint,
  getResizeHandleAtPoint,
  applyMoveTransform,
  applyResizeTransform,
  applyRotationTransform,
  getCursorForInteraction,
  type CanvasInteraction,
  type ResizeHandle
} from '../../lib/canvas/interactions';
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
  const snapToGrid = useAppStore((state) => state.snapToGrid);
  
  const selectLayer = useAppStore((state) => state.selectLayer);
  const selectLayers = useAppStore((state) => state.selectLayers);
  const deselectLayers = useAppStore((state) => state.deselectLayers);
  const updateLayerTransform = useAppStore((state) => state.updateLayerTransform);
  
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentInteraction, setCurrentInteraction] = useState<CanvasInteraction | null>(null);
  const [cursor, setCursor] = useState<string>('default');

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
      drawGrid(drawContext, gridSize, canvasState.zoom, canvasState.panX, canvasState.panY);
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
        drawSelectionHandles(drawContext, layer, asset, canvasState.zoom);
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
    const canvasPoint = screenToCanvas(
      e.clientX,
      e.clientY,
      rect,
      currentProject.settings.width,
      currentProject.settings.height,
      canvasState.zoom,
      canvasState.panX,
      canvasState.panY
    );
    
    console.log('Canvas clicked at:', canvasPoint);
    
    // Find layer at click point
    const clickedLayer = findLayerAtPoint(
      canvasPoint,
      currentProject.layers,
      currentProject.assets
    );
    
    if (clickedLayer) {
      // Select the clicked layer
      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        const isSelected = canvasState.selectedLayerIds.includes(clickedLayer.id);
        if (isSelected) {
          selectLayers(canvasState.selectedLayerIds.filter(id => id !== clickedLayer.id));
        } else {
          selectLayers([...canvasState.selectedLayerIds, clickedLayer.id]);
        }
      } else {
        selectLayer(clickedLayer.id);
      }
    } else {
      // Click on empty area - deselect all
      deselectLayers();
    }
  }, [currentProject, canvasState, selectLayer, selectLayers, deselectLayers]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current || !currentProject) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const canvasPoint = screenToCanvas(
      e.clientX,
      e.clientY,
      rect,
      currentProject.settings.width,
      currentProject.settings.height,
      canvasState.zoom,
      canvasState.panX,
      canvasState.panY
    );
    
    // Check if we're clicking on a selected layer's resize handle
    const selectedLayers = currentProject.layers.filter(layer =>
      canvasState.selectedLayerIds.includes(layer.id)
    );
    
    let resizeHandle: ResizeHandle | null = null;
    let targetLayer = null;
    
    for (const layer of selectedLayers) {
      const asset = currentProject.assets[layer.assetId];
      if (!asset) continue;
      
      const handle = getResizeHandleAtPoint(canvasPoint, layer, asset, canvasState.zoom);
      if (handle) {
        resizeHandle = handle;
        targetLayer = layer;
        break;
      }
    }
    
    if (resizeHandle && targetLayer) {
      // Start resize interaction
      setCurrentInteraction({
        type: 'resize',
        layerId: targetLayer.id,
        startPoint: canvasPoint,
        currentPoint: canvasPoint,
        startTransform: { ...targetLayer.transform },
        handle: resizeHandle
      });
    } else {
      // Check if clicking on a layer
      const clickedLayer = findLayerAtPoint(
        canvasPoint,
        currentProject.layers,
        currentProject.assets
      );
      
      if (clickedLayer && canvasState.selectedLayerIds.includes(clickedLayer.id)) {
        // Start move interaction on selected layer
        setCurrentInteraction({
          type: 'move',
          layerId: clickedLayer.id,
          startPoint: canvasPoint,
          currentPoint: canvasPoint,
          startTransform: { ...clickedLayer.transform }
        });
      } else if (clickedLayer) {
        // Select and start moving
        selectLayer(clickedLayer.id);
        setCurrentInteraction({
          type: 'move',
          layerId: clickedLayer.id,
          startPoint: canvasPoint,
          currentPoint: canvasPoint,
          startTransform: { ...clickedLayer.transform }
        });
      }
    }
  }, [currentProject, canvasState, selectLayer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current || !currentProject) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const canvasPoint = screenToCanvas(
      e.clientX,
      e.clientY,
      rect,
      currentProject.settings.width,
      currentProject.settings.height,
      canvasState.zoom,
      canvasState.panX,
      canvasState.panY
    );
    
    if (currentInteraction) {
      // Update current interaction
      const updatedInteraction = {
        ...currentInteraction,
        currentPoint: canvasPoint
      };
      
      setCurrentInteraction(updatedInteraction);
      
      // Apply transformation
      const layer = currentProject.layers.find(l => l.id === currentInteraction.layerId);
      const asset = layer ? currentProject.assets[layer.assetId] : null;
      
      if (layer && asset && currentInteraction.startTransform) {
        let newTransform = currentInteraction.startTransform;
        
        switch (currentInteraction.type) {
          case 'move':
            newTransform = applyMoveTransform(
              currentInteraction.startTransform,
              currentInteraction.startPoint,
              canvasPoint
            );
            break;
            
          case 'resize':
            if (currentInteraction.handle) {
              newTransform = applyResizeTransform(
                currentInteraction.startTransform,
                currentInteraction.startPoint,
                canvasPoint,
                currentInteraction.handle,
                asset,
                e.shiftKey // Maintain aspect ratio with shift
              );
            }
            break;
            
          case 'rotate':
            newTransform = applyRotationTransform(
              currentInteraction.startTransform,
              currentInteraction.startPoint,
              canvasPoint,
              { x: layer.transform.x, y: layer.transform.y }
            );
            break;
        }
        
        // Apply snap to grid if enabled
        if (snapToGrid && currentInteraction.type === 'move') {
          newTransform.x = Math.round(newTransform.x / gridSize) * gridSize;
          newTransform.y = Math.round(newTransform.y / gridSize) * gridSize;
        }
        
        updateLayerTransform(layer.id, newTransform);
      }
    } else {
      // Update cursor based on what's under the pointer
      const selectedLayers = currentProject.layers.filter(layer =>
        canvasState.selectedLayerIds.includes(layer.id)
      );
      
      let newCursor = 'default';
      
      // Check for resize handles first
      for (const layer of selectedLayers) {
        const asset = currentProject.assets[layer.assetId];
        if (!asset) continue;
        
        const handle = getResizeHandleAtPoint(canvasPoint, layer, asset, canvasState.zoom);
        if (handle) {
          newCursor = getCursorForInteraction('resize', handle);
          break;
        }
      }
      
      // If no resize handle, check if over a layer
      if (newCursor === 'default') {
        const hoveredLayer = findLayerAtPoint(
          canvasPoint,
          currentProject.layers,
          currentProject.assets
        );
        
        if (hoveredLayer) {
          newCursor = 'move';
        }
      }
      
      setCursor(newCursor);
    }
  }, [currentProject, canvasState, currentInteraction, updateLayerTransform, snapToGrid, gridSize]);

  const handlePointerUp = useCallback(() => {
    setCurrentInteraction(null);
    setCursor('default');
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Convert mouse event to pointer event for consistency
    handlePointerMove(e as any);
  }, [handlePointerMove]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - treat as pointer down
      const touch = e.touches[0];
      handlePointerDown({
        ...e,
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: e.preventDefault.bind(e)
      } as any);
    }
    // TODO: Handle multi-touch gestures (zoom, rotate)
  }, [handlePointerDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - treat as pointer move
      const touch = e.touches[0];
      handlePointerMove({
        ...e,
        clientX: touch.clientX,
        clientY: touch.clientY
      } as any);
    }
    // TODO: Handle multi-touch gestures
  }, [handlePointerMove]);

  const handleTouchEnd = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

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
            cursor
          }}
          onClick={handleCanvasClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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