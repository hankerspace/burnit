import { useState, useCallback } from 'react';
import { useAppStore } from '../../state';
import './ExportDialog.css';

export function ExportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'gif' | 'webm'>('png');
  const [isExporting, setIsExporting] = useState(false);
  
  const currentProject = useAppStore((state) => state.currentProject);

  const handleExport = useCallback(async () => {
    if (!currentProject) return;
    
    setIsExporting(true);
    
    try {
      // For now, just show an alert - actual export implementation would go here
      alert(`Export as ${exportFormat.toUpperCase()} - Not implemented yet`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  }, [currentProject, exportFormat]);

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
    <div className="export-dialog-overlay" onClick={() => setIsOpen(false)}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Export Project</h3>
          <button
            className="dialog-close btn btn-icon"
            onClick={() => setIsOpen(false)}
          >
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
                    <strong>Size:</strong> {currentProject.settings.width} × {currentProject.settings.height}
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