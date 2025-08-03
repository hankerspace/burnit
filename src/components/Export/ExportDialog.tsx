import { useState, useCallback } from 'react';
import { useAppStore } from '../../state';
import { exportService, type ExportProgress } from '../../lib/export';
import type { ExportOptions } from '../../types';
import './ExportDialog.css';

export function ExportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'gif' | 'webm'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportOptions, setExportOptions] = useState<Partial<ExportOptions>>({
    quality: 0.9,
    transparency: false
  });
  
  const currentProject = useAppStore((state) => state.currentProject);

  // Get available formats based on browser support
  const availableFormats = exportService.getAvailableFormats();

  const handleExport = useCallback(async () => {
    if (!currentProject) return;
    
    setIsExporting(true);
    setExportProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' });
    
    try {
      // Get recommended settings and merge with user options
      const recommended = exportService.getRecommendedSettings(exportFormat, currentProject);
      const finalOptions: ExportOptions = {
        format: exportFormat,
        ...recommended,
        ...exportOptions
      };

      const blob = await exportService.export(
        currentProject,
        finalOptions,
        (progress) => setExportProgress(progress)
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentProject.name}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress({ stage: 'complete', progress: 100, message: 'Export successful!' });
      
      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        setExportProgress(null);
      }, 2000);
      
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress({
        stage: 'complete',
        progress: 0,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, exportFormat, exportOptions]);

  const handleFormatChange = useCallback((format: typeof exportFormat) => {
    setExportFormat(format);
    if (currentProject) {
      const recommended = exportService.getRecommendedSettings(format, currentProject);
      setExportOptions({
        quality: recommended.quality,
        transparency: recommended.transparency && exportService.supportsTransparency(format)
      });
    }
  }, [currentProject]);

  const handleQualityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExportOptions(prev => ({
      ...prev,
      quality: parseFloat(e.target.value)
    }));
  }, []);

  const handleTransparencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExportOptions(prev => ({
      ...prev,
      transparency: e.target.checked
    }));
  }, []);

  if (!isOpen) {
    return (
      <button
        className="btn btn-primary"
        onClick={() => setIsOpen(true)}
        disabled={!currentProject}
      >
        Export
      </button>
    );
  }

  return (
    <div className="export-dialog-overlay" onClick={() => !isExporting && setIsOpen(false)}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Export Project</h3>
          <button
            className="dialog-close btn btn-icon"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            ×
          </button>
        </div>
        
        <div className="dialog-content">
          <div className="export-options">
            <div className="option-group">
              <label className="option-label">Format</label>
              <div className="format-buttons">
                {availableFormats.includes('png') && (
                  <button
                    className={`format-btn ${exportFormat === 'png' ? 'active' : ''}`}
                    onClick={() => handleFormatChange('png')}
                    disabled={isExporting}
                  >
                    PNG
                  </button>
                )}
                {availableFormats.includes('jpeg') && (
                  <button
                    className={`format-btn ${exportFormat === 'jpeg' ? 'active' : ''}`}
                    onClick={() => handleFormatChange('jpeg')}
                    disabled={isExporting}
                  >
                    JPEG
                  </button>
                )}
                {availableFormats.includes('gif') && (
                  <button
                    className={`format-btn ${exportFormat === 'gif' ? 'active' : ''}`}
                    onClick={() => handleFormatChange('gif')}
                    disabled={isExporting}
                  >
                    GIF
                  </button>
                )}
                {availableFormats.includes('webm') && (
                  <button
                    className={`format-btn ${exportFormat === 'webm' ? 'active' : ''}`}
                    onClick={() => handleFormatChange('webm')}
                    disabled={isExporting}
                    title="WebM video export"
                  >
                    WebM
                  </button>
                )}
              </div>
            </div>

            {/* Quality Slider */}
            <div className="option-group">
              <label className="option-label">
                Quality: {Math.round((exportOptions.quality || 0.9) * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={exportOptions.quality || 0.9}
                onChange={handleQualityChange}
                disabled={isExporting}
                className="quality-slider"
              />
            </div>

            {/* Transparency Option */}
            {exportService.supportsTransparency(exportFormat) && (
              <div className="option-group">
                <label className="option-checkbox">
                  <input
                    type="checkbox"
                    checked={exportOptions.transparency || false}
                    onChange={handleTransparencyChange}
                    disabled={isExporting}
                  />
                  <span>Transparent background</span>
                </label>
              </div>
            )}
            
            {currentProject && (
              <div className="export-preview">
                <div className="preview-info">
                  <p>
                    <strong>Size:</strong> {currentProject.settings.width} × {currentProject.settings.height}
                  </p>
                  <p>
                    <strong>FPS:</strong> {currentProject.settings.fps}
                  </p>
                  {(exportFormat === 'gif' || exportFormat === 'webm') && (
                    <p>
                      <strong>Duration:</strong> {(exportService.getRecommendedSettings(exportFormat, currentProject).loopDurationMs / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Progress Display */}
            {exportProgress && (
              <div className="export-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${exportProgress.progress}%` }}
                  />
                </div>
                <p className="progress-message">{exportProgress.message}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="dialog-footer">
          <button
            className="btn"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
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
  );
}