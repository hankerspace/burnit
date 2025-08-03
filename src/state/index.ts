import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Project,
  Asset,
  Layer,
  CompositionSettings,
  TimelineState,
  CanvasState,
  LayerTransform,
  UUID
} from '../types';
import { generateId } from '../utils/id';
import type { AssetLibrary } from '../lib/library';
import { libraryManager, loadLibrary } from '../lib/library';

interface AppState {
  // Project state
  currentProject: Project | null;
  
  // Timeline state
  timeline: TimelineState;
  
  // Canvas state
  canvas: CanvasState;
  
  // Library state
  library: AssetLibrary;
  
  // Undo state
  undoStack: Project[];
  
  // UI state
  selectedTool: 'select' | 'move' | 'rotate' | 'scale';
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  
  // Actions
  // Project actions
  createNewProject: (name: string) => void;
  loadProject: (project: Project) => void;
  updateProjectSettings: (settings: Partial<CompositionSettings>) => void;
  
  // Asset actions
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: UUID) => void;
  updateAsset: (assetId: UUID, updates: Partial<Asset>) => void;
  
  // Layer actions
  addLayer: (assetId: UUID, name?: string) => UUID;
  removeLayer: (layerId: UUID) => void;
  updateLayer: (layerId: UUID, updates: Partial<Layer>) => void;
  updateLayerTransform: (layerId: UUID, transform: Partial<LayerTransform>) => void;
  reorderLayers: (layerIds: UUID[]) => void;
  moveLayerUp: (layerId: UUID) => void;
  moveLayerDown: (layerId: UUID) => void;
  duplicateLayer: (layerId: UUID) => UUID;
  
  // Selection actions
  selectLayer: (layerId: UUID) => void;
  selectLayers: (layerIds: UUID[]) => void;
  deselectLayers: () => void;
  toggleLayerSelection: (layerId: UUID) => void;
  
  // Timeline actions
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  
  // Canvas actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  
  // Tool actions
  setTool: (tool: AppState['selectedTool']) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  
  // Library actions
  loadAssetLibrary: () => Promise<void>;
  addLibraryAssetToProject: (assetId: UUID, name?: string) => UUID | null;
  
  // Undo actions
  undo: () => void;
  saveStateForUndo: () => void;
}

const DEFAULT_COMPOSITION_SETTINGS: CompositionSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  loopDurationMs: 'auto',
  background: { type: 'transparent' }
};

const DEFAULT_TIMELINE_STATE: TimelineState = {
  currentTime: 0,
  isPlaying: true,
  speed: 1,
  loopStartTime: 0
};

const DEFAULT_CANVAS_STATE: CanvasState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedLayerIds: []
};

const DEFAULT_LAYER_TRANSFORM: LayerTransform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDeg: 0,
  opacity: 1
};

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProject: null,
    timeline: DEFAULT_TIMELINE_STATE,
    canvas: DEFAULT_CANVAS_STATE,
    library: { categories: [], isLoaded: false, isLoading: false },
    undoStack: [],
    selectedTool: 'select',
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,

    // Project actions
    createNewProject: (name: string) => {
      const project: Project = {
        id: generateId(),
        name,
        assets: {},
        layers: [],
        settings: { ...DEFAULT_COMPOSITION_SETTINGS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      set({
        currentProject: project,
        timeline: { ...DEFAULT_TIMELINE_STATE },
        canvas: { ...DEFAULT_CANVAS_STATE }
      });
    },

    loadProject: (project: Project) => {
      set({
        currentProject: project,
        timeline: { ...DEFAULT_TIMELINE_STATE },
        canvas: { ...DEFAULT_CANVAS_STATE }
      });
    },

    updateProjectSettings: (settings: Partial<CompositionSettings>) => {
      const { currentProject } = get();
      if (!currentProject) return;

      set({
        currentProject: {
          ...currentProject,
          settings: { ...currentProject.settings, ...settings },
          updatedAt: new Date().toISOString()
        }
      });
    },

    // Asset actions
    addAsset: (asset: Asset) => {
      const { currentProject } = get();
      if (!currentProject) return;

      set({
        currentProject: {
          ...currentProject,
          assets: { ...currentProject.assets, [asset.id]: asset as Asset },
          updatedAt: new Date().toISOString()
        }
      });
    },

    removeAsset: (assetId: UUID) => {
      const { currentProject } = get();
      if (!currentProject) return;

      const { [assetId]: removed, ...remainingAssets } = currentProject.assets;
      const remainingLayers = currentProject.layers.filter(layer => layer.assetId !== assetId);

      set({
        currentProject: {
          ...currentProject,
          assets: remainingAssets,
          layers: remainingLayers,
          updatedAt: new Date().toISOString()
        },
        canvas: {
          ...get().canvas,
          selectedLayerIds: get().canvas.selectedLayerIds.filter(id =>
            remainingLayers.some(layer => layer.id === id)
          )
        }
      });
    },

    updateAsset: (assetId: UUID, updates: Partial<Asset>) => {
      const { currentProject } = get();
      if (!currentProject || !currentProject.assets[assetId]) return;

      set({
        currentProject: {
          ...currentProject,
          assets: {
            ...currentProject.assets,
            [assetId]: { ...currentProject.assets[assetId], ...updates } as Asset
          },
          updatedAt: new Date().toISOString()
        }
      });
    },

    // Layer actions
    addLayer: (assetId: UUID, name?: string) => {
      const { currentProject } = get();
      if (!currentProject || !currentProject.assets[assetId]) return '';

      const asset = currentProject.assets[assetId];
      const layerId = generateId();
      
      // Calculate centered position based on composition settings and asset dimensions
      const canvasWidth = currentProject.settings.width;
      const canvasHeight = currentProject.settings.height;
      const centeredX = (canvasWidth - asset.width) / 2;
      const centeredY = (canvasHeight - asset.height) / 2;
      
      const layer: Layer = {
        id: layerId,
        assetId,
        name: name || asset.name,
        visible: true,
        locked: false,
        transform: { 
          ...DEFAULT_LAYER_TRANSFORM,
          x: centeredX,
          y: centeredY
        },
        blendMode: 'normal'
      };

      set({
        currentProject: {
          ...currentProject,
          layers: [...currentProject.layers, layer],
          updatedAt: new Date().toISOString()
        }
      });

      return layerId;
    },

    removeLayer: (layerId: UUID) => {
      const { currentProject } = get();
      if (!currentProject) return;

      set({
        currentProject: {
          ...currentProject,
          layers: currentProject.layers.filter(layer => layer.id !== layerId),
          updatedAt: new Date().toISOString()
        },
        canvas: {
          ...get().canvas,
          selectedLayerIds: get().canvas.selectedLayerIds.filter(id => id !== layerId)
        }
      });
    },

    updateLayer: (layerId: UUID, updates: Partial<Layer>) => {
      const { currentProject } = get();
      if (!currentProject) return;

      set({
        currentProject: {
          ...currentProject,
          layers: currentProject.layers.map(layer =>
            layer.id === layerId ? { ...layer, ...updates } : layer
          ),
          updatedAt: new Date().toISOString()
        }
      });
    },

    updateLayerTransform: (layerId: UUID, transform: Partial<LayerTransform>) => {
      const { currentProject } = get();
      if (!currentProject) return;

      set({
        currentProject: {
          ...currentProject,
          layers: currentProject.layers.map(layer =>
            layer.id === layerId
              ? { ...layer, transform: { ...layer.transform, ...transform } }
              : layer
          ),
          updatedAt: new Date().toISOString()
        }
      });
    },

    reorderLayers: (layerIds: UUID[]) => {
      const { currentProject } = get();
      if (!currentProject) return;

      const layerMap = new Map(currentProject.layers.map(layer => [layer.id, layer]));
      const reorderedLayers = layerIds.map(id => layerMap.get(id)!).filter(Boolean);

      set({
        currentProject: {
          ...currentProject,
          layers: reorderedLayers,
          updatedAt: new Date().toISOString()
        }
      });
    },

    moveLayerUp: (layerId: UUID) => {
      const { currentProject } = get();
      if (!currentProject) return;

      const layers = [...currentProject.layers];
      const currentIndex = layers.findIndex(layer => layer.id === layerId);
      
      // Can't move up if already at the end (front-most layer)
      if (currentIndex === -1 || currentIndex === layers.length - 1) return;

      // Swap with the next layer (move towards front)
      [layers[currentIndex], layers[currentIndex + 1]] = [layers[currentIndex + 1], layers[currentIndex]];

      set({
        currentProject: {
          ...currentProject,
          layers,
          updatedAt: new Date().toISOString()
        }
      });
    },

    moveLayerDown: (layerId: UUID) => {
      const { currentProject } = get();
      if (!currentProject) return;

      const layers = [...currentProject.layers];
      const currentIndex = layers.findIndex(layer => layer.id === layerId);
      
      // Can't move down if already at the beginning (back-most layer)
      if (currentIndex === -1 || currentIndex === 0) return;

      // Swap with the previous layer (move towards back)
      [layers[currentIndex], layers[currentIndex - 1]] = [layers[currentIndex - 1], layers[currentIndex]];

      set({
        currentProject: {
          ...currentProject,
          layers,
          updatedAt: new Date().toISOString()
        }
      });
    },

    duplicateLayer: (layerId: UUID) => {
      const { currentProject } = get();
      if (!currentProject) return '';

      const originalLayer = currentProject.layers.find(layer => layer.id === layerId);
      if (!originalLayer) return '';

      const newLayerId = generateId();
      const duplicatedLayer: Layer = {
        ...originalLayer,
        id: newLayerId,
        name: `${originalLayer.name} copy`
      };

      set({
        currentProject: {
          ...currentProject,
          layers: [...currentProject.layers, duplicatedLayer],
          updatedAt: new Date().toISOString()
        }
      });

      return newLayerId;
    },

    // Selection actions
    selectLayer: (layerId: UUID) => {
      set({
        canvas: { ...get().canvas, selectedLayerIds: [layerId] }
      });
    },

    selectLayers: (layerIds: UUID[]) => {
      set({
        canvas: { ...get().canvas, selectedLayerIds: layerIds }
      });
    },

    deselectLayers: () => {
      set({
        canvas: { ...get().canvas, selectedLayerIds: [] }
      });
    },

    toggleLayerSelection: (layerId: UUID) => {
      const { canvas } = get();
      const isSelected = canvas.selectedLayerIds.includes(layerId);
      
      if (isSelected) {
        set({
          canvas: {
            ...canvas,
            selectedLayerIds: canvas.selectedLayerIds.filter(id => id !== layerId)
          }
        });
      } else {
        set({
          canvas: {
            ...canvas,
            selectedLayerIds: [...canvas.selectedLayerIds, layerId]
          }
        });
      }
    },

    // Timeline actions
    setCurrentTime: (time: number) => {
      set({
        timeline: { ...get().timeline, currentTime: Math.max(0, time) }
      });
    },

    play: () => {
      set({
        timeline: { ...get().timeline, isPlaying: true }
      });
    },

    pause: () => {
      set({
        timeline: { ...get().timeline, isPlaying: false }
      });
    },

    stop: () => {
      set({
        timeline: { ...get().timeline, isPlaying: false, currentTime: 0 }
      });
    },

    setSpeed: (speed: number) => {
      set({
        timeline: { ...get().timeline, speed: Math.max(0.1, Math.min(2, speed)) }
      });
    },

    // Canvas actions
    setZoom: (zoom: number) => {
      set({
        canvas: { ...get().canvas, zoom: Math.max(0.1, Math.min(5, zoom)) }
      });
    },

    setPan: (x: number, y: number) => {
      set({
        canvas: { ...get().canvas, panX: x, panY: y }
      });
    },

    resetView: () => {
      set({
        canvas: { ...get().canvas, zoom: 1, panX: 0, panY: 0 }
      });
    },

    // Tool actions
    setTool: (tool: AppState['selectedTool']) => {
      set({ selectedTool: tool });
    },

    setShowGrid: (show: boolean) => {
      set({ showGrid: show });
    },

    setSnapToGrid: (snap: boolean) => {
      set({ snapToGrid: snap });
    },

    setGridSize: (size: number) => {
      set({ gridSize: Math.max(5, Math.min(100, size)) });
    },

    // Library actions
    loadAssetLibrary: async () => {
      try {
        const library = await loadLibrary();
        set({ library });
        
        // Subscribe to library updates
        libraryManager.subscribe((updatedLibrary) => {
          set({ library: updatedLibrary });
        });
      } catch (error) {
        console.error('Failed to load asset library:', error);
        set({ 
          library: { categories: [], isLoaded: false, isLoading: false } 
        });
      }
    },

    addLibraryAssetToProject: (assetId: UUID, name?: string) => {
      const { currentProject, library } = get();
      if (!currentProject) {
        console.warn('No current project to add library asset to');
        return null;
      }

      // Find the asset in the library
      const libraryAsset = library.categories
        .flatMap(category => category.assets)
        .find(asset => asset.id === assetId);

      if (!libraryAsset) {
        console.warn(`Library asset with id ${assetId} not found`);
        return null;
      }

      // Create a copy of the asset with a new ID for the project
      const projectAsset: Asset = {
        ...libraryAsset,
        id: generateId(),
        name: name || libraryAsset.name
      };

      // Add the asset to the project
      set({
        currentProject: {
          ...currentProject,
          assets: { ...currentProject.assets, [projectAsset.id]: projectAsset },
          updatedAt: new Date().toISOString()
        }
      });

      // Create a layer for the asset
      const layerId = get().addLayer(projectAsset.id, projectAsset.name);
      
      return layerId;
    },

    // Undo actions
    saveStateForUndo: () => {
      const { currentProject, undoStack } = get();
      if (!currentProject) return;

      // Create a deep copy of the current project state
      const projectCopy: Project = {
        ...currentProject,
        assets: { ...currentProject.assets },
        layers: currentProject.layers.map(layer => ({
          ...layer,
          transform: { ...layer.transform }
        })),
        settings: { ...currentProject.settings }
      };

      // Add to undo stack (limit to 20 states)
      const newUndoStack = [...undoStack, projectCopy].slice(-20);
      
      set({ undoStack: newUndoStack });
    },

    undo: () => {
      const { undoStack } = get();
      if (undoStack.length === 0) return;

      // Get the last saved state
      const previousState = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);

      // Restore the previous state
      set({
        currentProject: previousState,
        undoStack: newUndoStack,
        canvas: { ...get().canvas, selectedLayerIds: [] } // Clear selection after undo
      });
    }
  }))
);