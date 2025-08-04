import { useState, useCallback } from 'react';
import { useAppStore } from '../../state';
import {
  exportProjectAsPNG,
  exportProjectAsJPEG,
  exportProjectAsGIF,
  exportProjectAsWebM,
  downloadBlob,
  generateExportFilename,
} from '../../lib/export';
import './ExportDialog.css';

interface ExportDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExportDialog({ isOpen: externalIsOpen, onOpenChange }: ExportDialogProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalIsOpen(open);
      }
    },
    [onOpenChange]
  );
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'gif' | 'webm'>('gif');
  const [isExporting, setIsExporting] = useState(false);

  const currentProject = useAppStore((state) => state.currentProject);
  const timeline = useAppStore((state) => state.timeline);

  // Helper function to resolve actual duration from project settings
  const getActualDuration = useCallback((project: typeof currentProject) => {
    if (!project) return 3000; // fallback

    if (project.settings.loopDurationMs !== 'auto') {
      return project.settings.loopDurationMs;
    }

    // Calculate max duration from animated assets (same logic as CanvasStage)
    const animatedAssets = Object.values(project.assets).filter(
      (asset) => asset.kind === 'gif' || asset.kind === 'video'
    );

    if (animatedAssets.length > 0) {
      return Math.max(
        ...animatedAssets.map((asset) =>
          asset.kind === 'gif' ? asset.totalDurationMs : asset.durationMs
        )
      );
    }

    return 3000; // fallback if no animated assets
  }, []);

  const handleExport = useCallback(async () => {
    if (!currentProject) return;

    setIsExporting(true);

    try {
      const currentTime = timeline.currentTime;
      const filename = generateExportFilename(currentProject.name, exportFormat);
      const actualDuration = getActualDuration(currentProject);

      if (exportFormat === 'png') {
        const blob = await exportProjectAsPNG(currentProject, currentTime);
        downloadBlob(blob, filename);
      } else if (exportFormat === 'jpeg') {
        const blob = await exportProjectAsJPEG(currentProject, currentTime, 0.9);
        downloadBlob(blob, filename);
      } else if (exportFormat === 'gif') {
        const blob = await exportProjectAsGIF(currentProject, 80, actualDuration);
        downloadBlob(blob, filename);
      } else if (exportFormat === 'webm') {
        const blob = await exportProjectAsWebM(currentProject, 2500000, actualDuration);
        downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  }, [currentProject, exportFormat, timeline.currentTime, getActualDuration, setIsOpen]);

  return (
    <>
      {!isOpen && (
        <button
          className="btn btn-primary"
          onClick={() => setIsOpen(true)}
          disabled={!currentProject}
        >
          Export
        </button>
      )}

      {isOpen && (
        <div className="export-dialog-overlay" onClick={() => setIsOpen(false)}>
          <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Export Project</h3>
              <button className="dialog-close btn btn-icon" onClick={() => setIsOpen(false)}>
                ×
              </button>
            </div>

            <div className="dialog-content">
              <div className="export-options">
                <div className="option-group">
                  <label className="option-label">Format</label>
                  <div className="format-buttons">
                    <button
                      className={`format-btn ${exportFormat === 'png' ? 'active' : ''}`}
                      onClick={() => setExportFormat('png')}
                    >
                      PNG
                    </button>
                    <button
                      className={`format-btn ${exportFormat === 'jpeg' ? 'active' : ''}`}
                      onClick={() => setExportFormat('jpeg')}
                    >
                      JPEG
                    </button>
                    <button
                      className={`format-btn ${exportFormat === 'gif' ? 'active' : ''}`}
                      onClick={() => setExportFormat('gif')}
                    >
                      GIF
                    </button>
                    <button
                      className={`format-btn ${exportFormat === 'webm' ? 'active' : ''}`}
                      onClick={() => setExportFormat('webm')}
                      title="WebM video export"
                    >
                      WebM
                    </button>
                  </div>
                </div>

                {currentProject && (
                  <div className="export-preview">
                    <div className="preview-info">
                      <p>
                        <strong>Size:</strong> {currentProject.settings.width} ×{' '}
                        {currentProject.settings.height}
                      </p>
                      <p>
                        <strong>FPS:</strong> {currentProject.settings.fps}
                      </p>
                      {(exportFormat === 'gif' || exportFormat === 'webm') && (
                        <p>
                          <strong>Duration:</strong> Animation will loop
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dialog-footer">
              <button className="btn" onClick={() => setIsOpen(false)} disabled={isExporting}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={isExporting || !currentProject}
              >
                {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
