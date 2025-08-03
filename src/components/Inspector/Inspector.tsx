import { useAppStore } from '../../state';
import './Inspector.css';

export function Inspector() {
  const currentProject = useAppStore((state) => state.currentProject);
  const selectedLayerIds = useAppStore((state) => state.canvas.selectedLayerIds);
  const updateLayerTransform = useAppStore((state) => state.updateLayerTransform);
  const updateLayer = useAppStore((state) => state.updateLayer);

  if (!currentProject) {
    return (
      <div className="inspector panel">
        <div className="panel-header">
          <h3>Inspector</h3>
        </div>
        <div className="panel-content">
          <p className="text-muted">No project loaded</p>
        </div>
      </div>
    );
  }

  const selectedLayers = currentProject.layers.filter(layer =>
    selectedLayerIds.includes(layer.id)
  );

  if (selectedLayers.length === 0) {
    return (
      <div className="inspector panel">
        <div className="panel-header">
          <h3>Inspector</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p className="text-muted">Select a layer to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const layer = selectedLayers[0]; // For now, edit only the first selected layer
  const asset = currentProject.assets[layer.assetId];

  return (
    <div className="inspector panel">
      <div className="panel-header">
        <h3>Inspector</h3>
        {selectedLayers.length > 1 && (
          <span className="text-muted text-sm">({selectedLayers.length} selected)</span>
        )}
      </div>
      
      <div className="panel-content">
        <div className="inspector-sections">
          {/* Layer Info */}
          <section className="inspector-section">
            <h4 className="section-title">Layer</h4>
            
            <div className="property-group">
              <label className="property-label">Name</label>
              <input
                type="text"
                className="input"
                value={layer.name}
                onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
              />
            </div>
            
            <div className="property-row">
              <div className="property-group">
                <label className="property-label">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
                  />
                  Visible
                </label>
              </div>
              
              <div className="property-group">
                <label className="property-label">
                  <input
                    type="checkbox"
                    checked={layer.locked}
                    onChange={(e) => updateLayer(layer.id, { locked: e.target.checked })}
                  />
                  Locked
                </label>
              </div>
            </div>
          </section>

          {/* Transform */}
          <section className="inspector-section">
            <h4 className="section-title">Transform</h4>
            
            <div className="property-row">
              <div className="property-group">
                <label className="property-label">X</label>
                <input
                  type="number"
                  className="input"
                  value={Math.round(layer.transform.x)}
                  onChange={(e) => updateLayerTransform(layer.id, { x: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="property-group">
                <label className="property-label">Y</label>
                <input
                  type="number"
                  className="input"
                  value={Math.round(layer.transform.y)}
                  onChange={(e) => updateLayerTransform(layer.id, { y: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="property-row">
              <div className="property-group">
                <label className="property-label">Scale X</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="input"
                  value={layer.transform.scaleX.toFixed(2)}
                  onChange={(e) => updateLayerTransform(layer.id, { scaleX: parseFloat(e.target.value) || 1 })}
                />
              </div>
              
              <div className="property-group">
                <label className="property-label">Scale Y</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="input"
                  value={layer.transform.scaleY.toFixed(2)}
                  onChange={(e) => updateLayerTransform(layer.id, { scaleY: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>
            
            <div className="property-group">
              <label className="property-label">Rotation (degrees)</label>
              <input
                type="number"
                step="1"
                min="-360"
                max="360"
                className="input"
                value={Math.round(layer.transform.rotationDeg)}
                onChange={(e) => updateLayerTransform(layer.id, { rotationDeg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div className="property-group">
              <label className="property-label">Opacity</label>
              <div className="opacity-controls">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={layer.transform.opacity}
                  onChange={(e) => updateLayerTransform(layer.id, { opacity: parseFloat(e.target.value) })}
                  className="opacity-slider"
                />
                <span className="opacity-value">
                  {Math.round(layer.transform.opacity * 100)}%
                </span>
              </div>
            </div>
          </section>

          {/* Asset Info */}
          {asset && (
            <section className="inspector-section">
              <h4 className="section-title">Asset Info</h4>
              
              <div className="asset-preview">
                {asset.kind === 'image' && (
                  <img src={asset.src} alt={asset.name} className="asset-preview-image" />
                )}
                {asset.kind === 'gif' && (
                  <img src={asset.src} alt={asset.name} className="asset-preview-image" />
                )}
                {asset.kind === 'video' && (
                  <video src={asset.src} className="asset-preview-video" muted loop />
                )}
              </div>
              
              <div className="asset-details">
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{asset.kind.toUpperCase()}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Size:</span>
                  <span className="detail-value">{asset.width} × {asset.height}</span>
                </div>
                
                {asset.kind === 'gif' && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">Frames:</span>
                      <span className="detail-value">{asset.frames.length}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{(asset.totalDurationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </>
                )}
                
                {asset.kind === 'video' && (
                  <div className="detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{(asset.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}