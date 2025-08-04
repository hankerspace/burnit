import { useState } from 'react';
import './MobileNav.css';

interface MobileNavProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onShowAssetUpload: () => void;
  onShowCameraCapture: () => void;
  onExport: () => void;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
}

export function MobileNav({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onShowAssetUpload,
  onShowCameraCapture,
  onExport,
  isLeftSidebarOpen,
  isRightSidebarOpen,
}: MobileNavProps) {
  const [showFAB, setShowFAB] = useState(false);

  return (
    <>
      {/* Mobile Header Controls */}
      <div className="mobile-nav">
        <button
          className={`mobile-nav-btn ${isLeftSidebarOpen ? 'active' : ''}`}
          onClick={onToggleLeftSidebar}
          aria-label="Toggle sidebar"
        >
          <span className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        
        <button
          className="mobile-nav-btn"
          onClick={onExport}
          aria-label="Export"
        >
          📤
        </button>
        
        <button
          className={`mobile-nav-btn ${isRightSidebarOpen ? 'active' : ''}`}
          onClick={onToggleRightSidebar}
          aria-label="Toggle inspector"
        >
          ⚙️
        </button>
      </div>

      {/* Floating Action Button */}
      <div className="fab-container">
        <button
          className={`fab-main ${showFAB ? 'active' : ''}`}
          onClick={() => setShowFAB(!showFAB)}
          aria-label="Quick actions"
        >
          {showFAB ? '✕' : '+'}
        </button>
        
        {showFAB && (
          <div className="fab-menu">
            <button
              className="fab-action"
              onClick={() => {
                onShowCameraCapture();
                setShowFAB(false);
              }}
              aria-label="Take photo"
            >
              <span className="fab-icon">📷</span>
              <span className="fab-label">Take Photo</span>
            </button>
            
            <button
              className="fab-action"
              onClick={() => {
                onShowAssetUpload();
                setShowFAB(false);
              }}
              aria-label="Add image"
            >
              <span className="fab-icon">🖼️</span>
              <span className="fab-label">Add Image</span>
            </button>
            
            <button
              className="fab-action"
              onClick={() => {
                onToggleLeftSidebar();
                setShowFAB(false);
              }}
              aria-label="Open assets"
            >
              <span className="fab-icon">📁</span>
              <span className="fab-label">Assets</span>
            </button>
            
            <button
              className="fab-action"
              onClick={() => {
                onToggleRightSidebar();
                setShowFAB(false);
              }}
              aria-label="Open inspector"
            >
              <span className="fab-icon">🔧</span>
              <span className="fab-label">Inspector</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}