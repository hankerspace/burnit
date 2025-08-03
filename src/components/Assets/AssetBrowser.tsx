import React, { useCallback, useState } from 'react';
import { useAppStore } from '../../state';
import { decodeGif } from '../../lib/gif/decode';
import { createImageAsset, createVideoAsset, supportsWebMVideo } from '../../lib/video/utils';
import { isImageFile, isGifFile, isVideoFile } from '../../utils/file';
import type { Asset } from '../../types';
import './AssetBrowser.css';

export function AssetBrowser() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const assets = useAppStore((state) => state.currentProject?.assets || {});
  const addAsset = useAppStore((state) => state.addAsset);
  const addLayer = useAppStore((state) => state.addLayer);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        let asset: Asset;
        
        if (isImageFile(file)) {
          asset = await createImageAsset(file);
        } else if (isGifFile(file)) {
          asset = await decodeGif(file);
        } else if (isVideoFile(file)) {
          if (!supportsWebMVideo()) {
            alert('WebM video format is not supported in this browser');
            continue;
          }
          asset = await createVideoAsset(file);
        } else {
          alert(`Unsupported file format: ${file.type}`);
          continue;
        }
        
        addAsset(asset);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [addAsset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFileUpload]);

  const handleAddToCanvas = useCallback((asset: Asset) => {
    const layerId = addLayer(asset.id);
    if (layerId) {
      console.log(`Added layer ${layerId} for asset ${asset.name}`);
    }
  }, [addLayer]);

  const assetList = Object.values(assets);

  return (
    <div className="asset-browser panel">
      <div className="panel-header">
        <h3>Assets</h3>
        <span className="text-muted text-sm">({assetList.length})</span>
      </div>
      
      <div className="panel-content">
        {/* Upload Area */}
        <div
          className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="file-input"
            className="file-input"
            multiple
            accept="image/png,image/jpeg,image/gif,video/webm"
            onChange={handleFileInput}
            disabled={isUploading}
          />
          
          <div className="upload-content">
            {isUploading ? (
              <>
                <div className="upload-spinner animate-pulse"></div>
                <p>Processing files...</p>
              </>
            ) : (
              <>
                <div className="upload-icon">📁</div>
                <p>
                  <strong>Drag & drop files here</strong><br />
                  or <label htmlFor="file-input" className="upload-link">browse files</label>
                </p>
                <p className="text-xs text-muted">
                  Supports PNG, JPEG, GIF, WebM
                </p>
              </>
            )}
          </div>
        </div>

        {/* Asset List */}
        <div className="asset-list">
          {assetList.length === 0 ? (
            <div className="empty-state">
              <p className="text-muted">No assets yet. Add some files to get started!</p>
            </div>
          ) : (
            assetList.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onAddToCanvas={() => handleAddToCanvas(asset)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface AssetItemProps {
  asset: Asset;
  onAddToCanvas: () => void;
}

function AssetItem({ asset, onAddToCanvas }: AssetItemProps) {
  const removeAsset = useAppStore((state) => state.removeAsset);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove "${asset.name}" from project?`)) {
      removeAsset(asset.id);
    }
  }, [asset.id, asset.name, removeAsset]);

  const renderThumbnail = () => {
    switch (asset.kind) {
      case 'image':
        return (
          <img
            src={asset.src}
            alt={asset.name}
            className="asset-thumbnail"
            loading="lazy"
          />
        );
      case 'gif':
        return (
          <div className="asset-thumbnail gif-thumbnail">
            <img
              src={asset.src}
              alt={asset.name}
              loading="lazy"
            />
            <div className="asset-badge">GIF</div>
          </div>
        );
      case 'video':
        return (
          <div className="asset-thumbnail video-thumbnail">
            <video
              src={asset.src}
              className="asset-video"
              muted
              loop
              playsInline
            />
            <div className="asset-badge">WebM</div>
          </div>
        );
    }
  };

  return (
    <div className="asset-item" onClick={onAddToCanvas}>
      <div className="asset-thumbnail-container">
        {renderThumbnail()}
      </div>
      
      <div className="asset-info">
        <div className="asset-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-meta text-xs text-muted">
          {asset.width} × {asset.height}
          {asset.kind === 'gif' && (
            <span> • {asset.frames.length} frames</span>
          )}
          {asset.kind === 'video' && (
            <span> • {(asset.durationMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>
      
      <button
        className="asset-remove btn btn-small btn-icon"
        onClick={handleRemove}
        title="Remove asset"
      >
        ×
      </button>
    </div>
  );
}