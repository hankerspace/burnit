import React from 'react';
import { useAppStore } from '../../state';
import './ProjectSettings.css';

export function ProjectSettings() {
  const currentProject = useAppStore((state) => state.currentProject);
  const updateProjectSettings = useAppStore((state) => state.updateProjectSettings);

  if (!currentProject) {
    return (
      <div className="project-settings">
        <div className="empty-state">
          <p className="text-muted">No project loaded</p>
        </div>
      </div>
    );
  }

  const { settings } = currentProject;

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseInt(e.target.value) || 1;
    updateProjectSettings({ width: Math.max(1, Math.min(7680, width)) });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value) || 1;
    updateProjectSettings({ height: Math.max(1, Math.min(4320, height)) });
  };

  const handleFpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fps = parseInt(e.target.value) || 1;
    updateProjectSettings({ fps: Math.max(1, Math.min(120, fps)) });
  };

  const handleLoopDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === 'auto') {
      updateProjectSettings({ loopDurationMs: 'auto' });
    } else {
      const duration = parseInt(value) || 1000;
      updateProjectSettings({ loopDurationMs: Math.max(100, duration) });
    }
  };

  const handleBackgroundTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'transparent' | 'color';
    if (type === 'transparent') {
      updateProjectSettings({ background: { type: 'transparent' } });
    } else {
      updateProjectSettings({ 
        background: { 
          type: 'color', 
          color: settings.background.color || '#000000' 
        } 
      });
    }
  };

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProjectSettings({ 
      background: { 
        type: 'color', 
        color: e.target.value 
      } 
    });
  };

  // Preset canvas sizes
  const presets = [
    { name: 'HD (1280×720)', width: 1280, height: 720 },
    { name: 'Full HD (1920×1080)', width: 1920, height: 1080 },
    { name: 'Square (1080×1080)', width: 1080, height: 1080 },
    { name: '4K (3840×2160)', width: 3840, height: 2160 },
    { name: 'Portrait (1080×1920)', width: 1080, height: 1920 },
  ];

  const applyPreset = (width: number, height: number) => {
    updateProjectSettings({ width, height });
  };

  return (
    <div className="project-settings">
      <div className="settings-sections">
        {/* Canvas Size */}
        <section className="settings-section">
          <h4 className="section-title">Canvas Size</h4>
          
          <div className="property-row">
            <div className="property-group">
              <label className="property-label">Width</label>
              <input
                type="number"
                className="input"
                value={settings.width}
                onChange={handleWidthChange}
                min="1"
                max="7680"
              />
            </div>
            
            <div className="property-group">
              <label className="property-label">Height</label>
              <input
                type="number"
                className="input"
                value={settings.height}
                onChange={handleHeightChange}
                min="1"
                max="4320"
              />
            </div>
          </div>

          <div className="property-group">
            <label className="property-label">Presets</label>
            <div className="preset-buttons">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  className={`preset-button ${
                    settings.width === preset.width && settings.height === preset.height
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => applyPreset(preset.width, preset.height)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Animation Settings */}
        <section className="settings-section">
          <h4 className="section-title">Animation</h4>
          
          <div className="property-group">
            <label className="property-label">Frame Rate (FPS)</label>
            <input
              type="number"
              className="input"
              value={settings.fps}
              onChange={handleFpsChange}
              min="1"
              max="120"
            />
            <small className="property-hint">
              Higher values create smoother animation but larger file sizes
            </small>
          </div>

          <div className="property-group">
            <label className="property-label">Loop Duration (ms)</label>
            <input
              type="text"
              className="input"
              value={settings.loopDurationMs === 'auto' ? 'auto' : settings.loopDurationMs}
              onChange={handleLoopDurationChange}
              placeholder="auto or milliseconds"
            />
            <small className="property-hint">
              Use "auto" to match the longest animated asset, or specify duration in milliseconds
            </small>
          </div>
        </section>

        {/* Background */}
        <section className="settings-section">
          <h4 className="section-title">Background</h4>
          
          <div className="property-group">
            <label className="property-label">Type</label>
            <select
              className="input"
              value={settings.background.type}
              onChange={handleBackgroundTypeChange}
            >
              <option value="transparent">Transparent</option>
              <option value="color">Solid Color</option>
            </select>
          </div>

          {settings.background.type === 'color' && (
            <div className="property-group">
              <label className="property-label">Color</label>
              <div className="color-input-group">
                <input
                  type="color"
                  className="color-input"
                  value={settings.background.color || '#000000'}
                  onChange={handleBackgroundColorChange}
                />
                <input
                  type="text"
                  className="input color-text-input"
                  value={settings.background.color || '#000000'}
                  onChange={handleBackgroundColorChange}
                />
              </div>
            </div>
          )}
        </section>

        {/* Project Info */}
        <section className="settings-section">
          <h4 className="section-title">Project Info</h4>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Current Size:</span>
              <span className="info-value">{settings.width} × {settings.height}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Aspect Ratio:</span>
              <span className="info-value">
                {(settings.width / settings.height).toFixed(2)}:1
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Frame Rate:</span>
              <span className="info-value">{settings.fps} FPS</span>
            </div>
            <div className="info-item">
              <span className="info-label">Loop Duration:</span>
              <span className="info-value">
                {settings.loopDurationMs === 'auto' 
                  ? 'Auto' 
                  : `${settings.loopDurationMs}ms`
                }
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}