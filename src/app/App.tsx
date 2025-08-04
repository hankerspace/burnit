import React from 'react';
import { TabbedSidebar } from '../components/TabbedSidebar/TabbedSidebar';
import { CanvasStage } from '../components/Canvas/CanvasStage';
import { Timeline } from '../components/Timeline/Timeline';
import { Inspector } from '../components/Inspector/Inspector';
import { ExportDialog } from '../components/Export/ExportDialog';
import { MobileNav } from '../components/MobileNav/MobileNav';
import { MobileFileUpload } from '../components/MobileNav/MobileFileUpload';
import { CameraCapture } from '../components/Camera/CameraCapture';
import { useAppStore } from '../state';
import type { Layer } from '../types';
import './App.css';

function App() {
  const currentProject = useAppStore((state) => state.currentProject);
  const selectedLayerIds = useAppStore((state) => state.canvas.selectedLayerIds);

  // State for copied layers
  const [copiedLayers, setCopiedLayers] = React.useState<Layer[]>([]);

  // Mobile state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(false);
  const [showMobileUpload, setShowMobileUpload] = React.useState(false);
  const [showCameraCapture, setShowCameraCapture] = React.useState(false);
  const [showMobileExport, setShowMobileExport] = React.useState(false);

  React.useEffect(() => {
    // Create a default project if none exists
    if (!currentProject) {
      useAppStore.getState().createNewProject('Untitled Project');
    }

    // Load the asset library
    useAppStore.getState().loadAssetLibrary();
  }, [currentProject]);

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const store = useAppStore.getState();

      // Ctrl+C - Copy selected layers
      if (e.ctrlKey && e.key === 'c' && selectedLayerIds.length > 0 && currentProject) {
        e.preventDefault();
        const layersToCopy = currentProject.layers.filter((layer) =>
          selectedLayerIds.includes(layer.id)
        );
        setCopiedLayers(layersToCopy);
      }

      // Ctrl+V - Paste copied layers
      else if (e.ctrlKey && e.key === 'v' && copiedLayers.length > 0 && currentProject) {
        e.preventDefault();
        // Save state before adding new layers
        store.saveStateForUndo();
        const newLayerIds: string[] = [];

        copiedLayers.forEach((copiedLayer) => {
          // Check if the asset still exists in the current project
          const asset = currentProject.assets[copiedLayer.assetId];
          if (asset) {
            // Create a new layer with the same asset but new ID and offset position
            const newLayerId = store.addLayer(copiedLayer.assetId, `${copiedLayer.name} Copy`);
            if (newLayerId) {
              newLayerIds.push(newLayerId);
              // Apply the copied layer's properties with slight offset
              store.updateLayer(newLayerId, {
                visible: copiedLayer.visible,
                locked: copiedLayer.locked,
                blendMode: copiedLayer.blendMode,
              });
              store.updateLayerTransform(newLayerId, {
                ...copiedLayer.transform,
                x: copiedLayer.transform.x + 20,
                y: copiedLayer.transform.y + 20,
              });
            }
          }
        });

        // Select the newly pasted layers
        if (newLayerIds.length > 0) {
          store.selectLayers(newLayerIds);
        }
      }

      // Delete - Remove selected layers
      else if (e.key === 'Delete' && selectedLayerIds.length > 0) {
        e.preventDefault();
        // Save state before destructive operation
        store.saveStateForUndo();
        selectedLayerIds.forEach((layerId) => {
          store.removeLayer(layerId);
        });
      }

      // Ctrl+Z - Undo
      else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        store.undo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerIds, copiedLayers, currentProject]);

  if (!currentProject) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner animate-glow"></div>
          <h2 className="text-fire">Burn It</h2>
          <p className="text-muted">Loading your creative space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1 className="text-fire font-semibold">🔥 Burn It</h1>
          <span className="text-muted">/ {currentProject.name}</span>
        </div>
        <div className="app-actions">
          <ExportDialog 
            isOpen={showMobileExport} 
            onOpenChange={(open) => {
              setShowMobileExport(open);
              // Also reset the mobile export state when dialog closes
              if (!open) {
                setShowMobileExport(false);
              }
            }} 
          />
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        onShowAssetUpload={() => setShowMobileUpload(true)}
        onShowCameraCapture={() => setShowCameraCapture(true)}
        onExport={() => {
          console.log('Mobile export button clicked');
          setShowMobileExport(true);
        }}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
      />

      {/* Mobile Overlay */}
      {(isLeftSidebarOpen || isRightSidebarOpen) && (
        <div
          className="mobile-overlay active"
          onClick={() => {
            setIsLeftSidebarOpen(false);
            setIsRightSidebarOpen(false);
          }}
        />
      )}

      <div className="app-content">
        <aside className={`app-sidebar-left ${isLeftSidebarOpen ? 'is-open' : ''}`}>
          <TabbedSidebar />
        </aside>

        <main className="app-main">
          <CanvasStage />
          <Timeline />
        </main>

        <aside className={`app-sidebar-right ${isRightSidebarOpen ? 'is-open' : ''}`}>
          <Inspector />
        </aside>
      </div>

      {/* Mobile File Upload Dialog */}
      <MobileFileUpload isOpen={showMobileUpload} onClose={() => setShowMobileUpload(false)} />

      {/* Camera Capture Dialog */}
      <CameraCapture isOpen={showCameraCapture} onClose={() => setShowCameraCapture(false)} />
    </div>
  );
}

export default App;
