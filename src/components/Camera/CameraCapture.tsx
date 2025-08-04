import { useRef, useCallback, useState, useEffect } from 'react';
import { useAppStore } from '../../state';
import { generateId } from '../../utils/id';
import type { ImageAsset } from '../../types';
import './CameraCapture.css';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CameraCapture({ isOpen, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Capture photo and add to canvas
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Unable to get canvas context');
      }

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to capture image'));
            }
          },
          'image/jpeg',
          0.9
        );
      });

      // Create ImageAsset
      const img = new Image();
      const url = URL.createObjectURL(blob);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const bitmap = await createImageBitmap(img);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

      const asset: ImageAsset = {
        id: generateId(),
        name: `Photo_${timestamp}`,
        kind: 'image',
        width: bitmap.width,
        height: bitmap.height,
        src: url,
        bitmap,
      };

      // Add asset to project
      const store = useAppStore.getState();
      store.addAsset(asset);

      // Create layer at center of canvas
      const layerId = store.addLayer(asset.id, asset.name);
      if (layerId) {
        // Position at center of canvas
        const currentProject = store.currentProject;
        if (currentProject) {
          const centerX = currentProject.settings.width / 2;
          const centerY = currentProject.settings.height / 2;

          store.updateLayerTransform(layerId, {
            x: centerX,
            y: centerY,
          });

          // Select the newly created layer
          store.selectLayer(layerId);
        }
      }

      // Close camera after successful capture
      onClose();
    } catch (error) {
      console.error('Error capturing photo:', error);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [onClose]);

  // Start camera when component opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="camera-capture-overlay">
      <div className="camera-capture-modal">
        <div className="camera-capture-header">
          <h3>Take Photo</h3>
          <button className="close-button" onClick={onClose} aria-label="Close camera">
            ✕
          </button>
        </div>

        <div className="camera-capture-content">
          {error ? (
            <div className="camera-error">
              <p>{error}</p>
              <button onClick={startCamera} className="retry-button">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="camera-preview">
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              <div className="camera-controls">
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="capture-button"
                  aria-label="Capture photo"
                >
                  {isCapturing ? (
                    <span className="capture-spinner">⌛</span>
                  ) : (
                    <span className="capture-icon">📷</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
