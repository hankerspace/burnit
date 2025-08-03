import React, { useCallback, useState } from 'react';
import { useAppStore } from '../../state';
import type { Layer, Asset } from '../../types';
import './LayerList.css';

export function LayerList() {
  const currentProject = useAppStore((state) => state.currentProject);
  const selectedLayerIds = useAppStore((state) => state.canvas.selectedLayerIds);
  const selectLayer = useAppStore((state) => state.selectLayer);
  const toggleLayerSelection = useAppStore((state) => state.toggleLayerSelection);
  const updateLayer = useAppStore((state) => state.updateLayer);
  const removeLayer = useAppStore((state) => state.removeLayer);
  const duplicateLayer = useAppStore((state) => state.duplicateLayer);
  const reorderLayers = useAppStore((state) => state.reorderLayers);

  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const handleDragStart = useCallback((layerId: string) => {
    setDraggedLayerId(layerId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    setDragOverLayerId(layerId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverLayerId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    
    if (!draggedLayerId || !currentProject || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const currentLayers = [...currentProject.layers];
    const draggedIndex = currentLayers.findIndex(layer => layer.id === draggedLayerId);
    const targetIndex = currentLayers.findIndex(layer => layer.id === targetLayerId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged layer from current position
    const [draggedLayer] = currentLayers.splice(draggedIndex, 1);
    
    // Insert at new position
    currentLayers.splice(targetIndex, 0, draggedLayer);
    
    // Update layer order
    const newLayerIds = currentLayers.map(layer => layer.id);
    reorderLayers(newLayerIds);
    
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, [draggedLayerId, currentProject, reorderLayers]);

  if (!currentProject) {
    return (
      <div className="layer-list panel">
        <div className="panel-header">
          <h3>Layers</h3>
        </div>
        <div className="panel-content">
          <p className="text-muted">No project loaded</p>
        </div>
      </div>
    );
  }

  const { layers, assets } = currentProject;

  return (
    <div className="layer-list panel">
      <div className="panel-header">
        <h3>Layers</h3>
        <span className="text-muted text-sm">({layers.length})</span>
      </div>
      
      <div className="panel-content">
        {layers.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No layers yet. Add some assets to create layers!</p>
          </div>
        ) : (
          <div className="layer-items">
            {/* Render layers in reverse order (top to bottom in UI = front to back in canvas) */}
            {[...layers].reverse().map((layer) => {
              const asset = assets[layer.assetId];
              return (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  asset={asset}
                  isSelected={selectedLayerIds.includes(layer.id)}
                  isDragging={draggedLayerId === layer.id}
                  isDragOver={dragOverLayerId === layer.id}
                  onSelect={selectLayer}
                  onToggleSelect={toggleLayerSelection}
                  onUpdate={updateLayer}
                  onRemove={removeLayer}
                  onDuplicate={duplicateLayer}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface LayerItemProps {
  layer: Layer;
  asset?: Asset;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: (layerId: string) => void;
  onToggleSelect: (layerId: string) => void;
  onUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onRemove: (layerId: string) => void;
  onDuplicate: (layerId: string) => void;
  onDragStart: (layerId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, layerId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, layerId: string) => void;
}

function LayerItem({
  layer,
  asset,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onToggleSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}: LayerItemProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      onToggleSelect(layer.id);
    } else {
      onSelect(layer.id);
    }
  }, [layer.id, onSelect, onToggleSelect]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layer.id);
    onDragStart(layer.id);
  }, [layer.id, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    onDragOver(e, layer.id);
  }, [layer.id, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    onDrop(e, layer.id);
  }, [layer.id, onDrop]);

  const handleVisibilityToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(layer.id, { visible: !layer.visible });
  }, [layer.id, layer.visible, onUpdate]);

  const handleLockToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(layer.id, { locked: !layer.locked });
  }, [layer.id, layer.locked, onUpdate]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove layer "${layer.name}"?`)) {
      onRemove(layer.id);
    }
  }, [layer.id, layer.name, onRemove]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(layer.id);
  }, [layer.id, onDuplicate]);

  const renderThumbnail = () => {
    if (!asset) {
      return <div className="layer-thumbnail missing">?</div>;
    }

    switch (asset.kind) {
      case 'image':
        return (
          <img
            src={asset.src}
            alt={asset.name}
            className="layer-thumbnail"
            loading="lazy"
          />
        );
      case 'gif':
        return (
          <div className="layer-thumbnail gif-thumbnail">
            <img src={asset.src} alt={asset.name} loading="lazy" />
            <div className="layer-badge gif-badge">
              <span>GIF</span>
              <span className="frame-count">{asset.frames.length}f</span>
            </div>
            <div className="layer-duration">
              {(asset.totalDurationMs / 1000).toFixed(1)}s
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="layer-thumbnail video-thumbnail">
            <video src={asset.src} className="layer-video" muted />
            <div className="layer-badge video-badge">
              <span>WebM</span>
            </div>
            <div className="layer-duration">
              {(asset.durationMs / 1000).toFixed(1)}s
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`layer-item ${isSelected ? 'selected' : ''} ${!layer.visible ? 'hidden' : ''} ${layer.locked ? 'locked' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={handleClick}
      draggable={!layer.locked}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <div className="drag-handle">
        ⋮⋮
      </div>
      
      <div className="layer-thumbnail-container">
        {renderThumbnail()}
      </div>
      
      <div className="layer-info">
        <div className="layer-name" title={layer.name}>
          {layer.name}
        </div>
        {asset && (
          <div className="layer-meta text-xs text-muted">
            {Math.round(layer.transform.opacity * 100)}% opacity
            {layer.transform.rotationDeg !== 0 && (
              <span> • {layer.transform.rotationDeg}° rotation</span>
            )}
            {asset.kind === 'gif' && (
              <span> • {asset.frames.length} frames, {(asset.totalDurationMs / 1000).toFixed(1)}s</span>
            )}
            {asset.kind === 'video' && (
              <span> • {(asset.durationMs / 1000).toFixed(1)}s duration</span>
            )}
          </div>
        )}
      </div>
      
      <div className="layer-controls">
        <button
          className={`layer-control ${layer.visible ? 'active' : ''}`}
          onClick={handleVisibilityToggle}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? '👁' : '🙈'}
        </button>
        
        <button
          className={`layer-control ${layer.locked ? 'active' : ''}`}
          onClick={handleLockToggle}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? '🔒' : '🔓'}
        </button>
      </div>
      
      <div className="layer-actions">
        <button
          className="layer-action btn btn-small btn-icon"
          onClick={handleDuplicate}
          title="Duplicate layer"
        >
          📋
        </button>
        
        <button
          className="layer-action btn btn-small btn-icon"
          onClick={handleRemove}
          title="Remove layer"
        >
          🗑
        </button>
      </div>
    </div>
  );
}