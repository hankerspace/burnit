import React, { useCallback, useState, useRef } from 'react';
import { useAppStore } from '../../state';
import { decodeGif } from '../../lib/gif/decode';
import { createImageAsset, createVideoAsset, supportsWebMVideo } from '../../lib/video/utils';
import { isImageFile, isGifFile, isVideoFile } from '../../utils/file';
import type { Asset } from '../../types';
import './MobileFileUpload.css';

interface MobileFileUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFileUpload({ isOpen, onClose }: MobileFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addAsset = useAppStore((state) => state.addAsset);

  const handleFileUpload = useCallback(
    async (files: FileList) => {
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
        onClose();
      } catch (error) {
        console.error('Error uploading files:', error);
        alert('Error uploading files. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [addAsset, onClose]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-overlay active" onClick={onClose} />
      <div className="mobile-upload-dialog">
        <div className="mobile-upload-header">
          <h3>Add Images</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mobile-upload-content">
          <div
            className={`mobile-upload-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleBrowseFiles}
          >
            <div className="upload-content">
              {isUploading ? (
                <>
                  <div className="upload-spinner animate-glow"></div>
                  <p>
                    <strong>Uploading...</strong>
                  </p>
                </>
              ) : (
                <>
                  <div className="upload-icon">📁</div>
                  <p>
                    <strong>Tap to browse files</strong>
                    <br />
                    or drag & drop here
                  </p>
                  <p className="text-muted text-sm">Supports PNG, JPEG, GIF, WebM</p>
                </>
              )}
            </div>
          </div>

          <div className="mobile-upload-actions">
            <button
              className="mobile-action-btn"
              onClick={handleBrowseFiles}
              disabled={isUploading}
            >
              <span className="action-icon">📁</span>
              <span className="action-text">Browse Files</span>
            </button>

            <button className="mobile-action-btn" onClick={handleTakePhoto} disabled={isUploading}>
              <span className="action-icon">📷</span>
              <span className="action-text">Take Photo</span>
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/webm,.gif"
          multiple
          onChange={handleFileChange}
          className="file-input"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="file-input"
        />
      </div>
    </>
  );
}
