import React, { useState } from 'react';
import { AssetBrowser } from '../Assets/AssetBrowser';
import { LayerList } from '../LayerList/LayerList';
import './TabbedSidebar.css';

type TabType = 'assets' | 'layers';

export function TabbedSidebar() {
  const [activeTab, setActiveTab] = useState<TabType>('assets');

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <div className="tabbed-sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => handleTabClick('assets')}
        >
          <span className="tab-icon">📁</span>
          <span className="tab-label">Assets</span>
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => handleTabClick('layers')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">Layers</span>
        </button>
      </div>
      
      <div className="sidebar-content">
        {activeTab === 'assets' && (
          <div className="tab-panel">
            <AssetBrowser />
          </div>
        )}
        {activeTab === 'layers' && (
          <div className="tab-panel">
            <LayerList />
          </div>
        )}
      </div>
    </div>
  );
}