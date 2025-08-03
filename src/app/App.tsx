import React from 'react';
import { TabbedSidebar } from '../components/TabbedSidebar/TabbedSidebar';
import { CanvasStage } from '../components/Canvas/CanvasStage';
import { Timeline } from '../components/Timeline/Timeline';
import { Inspector } from '../components/Inspector/Inspector';
import { ExportDialog } from '../components/Export/ExportDialog';
import { useAppStore } from '../state';
import './App.css';

function App() {
  const currentProject = useAppStore((state) => state.currentProject);

  React.useEffect(() => {
    // Create a default project if none exists
    if (!currentProject) {
      useAppStore.getState().createNewProject('Untitled Project');
    }
    
    // Load the asset library
    useAppStore.getState().loadAssetLibrary();
  }, [currentProject]);

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
          <ExportDialog />
        </div>
      </header>

      <div className="app-content">
        <aside className="app-sidebar-left">
          <TabbedSidebar />
        </aside>

        <main className="app-main">
          <CanvasStage />
          <Timeline />
        </main>

        <aside className="app-sidebar-right">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}

export default App;