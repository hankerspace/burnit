import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../state';

describe('App Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      currentProject: null,
      timeline: {
        currentTime: 0,
        isPlaying: false,
        speed: 1,
        loopStartTime: 0,
      },
      canvas: {
        zoom: 1,
        panX: 0,
        panY: 0,
        selectedLayerIds: [],
      },
      selectedTool: 'select',
      showGrid: false,
      snapToGrid: false,
      gridSize: 20,
    });
  });

  describe('Project Management', () => {
    it('should create a new project', () => {
      const { createNewProject } = useAppStore.getState();

      createNewProject('Test Project');

      const project = useAppStore.getState().currentProject;
      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
      expect(project?.assets).toEqual({});
      expect(project?.layers).toEqual([]);
      expect(project?.settings.width).toBe(1920);
      expect(project?.settings.height).toBe(1080);
      expect(project?.settings.fps).toBe(30);
    });

    it('should update project settings', () => {
      const { createNewProject, updateProjectSettings } = useAppStore.getState();

      createNewProject('Test Project');
      updateProjectSettings({
        width: 1280,
        height: 720,
        fps: 24,
      });

      const project = useAppStore.getState().currentProject;
      expect(project?.settings.width).toBe(1280);
      expect(project?.settings.height).toBe(720);
      expect(project?.settings.fps).toBe(24);
    });
  });

  describe('Asset Management', () => {
    beforeEach(() => {
      useAppStore.getState().createNewProject('Test Project');
    });

    it('should add an asset', () => {
      const { addAsset } = useAppStore.getState();

      const mockAsset = {
        id: 'test-asset-1',
        name: 'test.png',
        kind: 'image' as const,
        width: 100,
        height: 100,
        src: 'blob:test-url',
        bitmap: {} as ImageBitmap,
      };

      addAsset(mockAsset);

      const project = useAppStore.getState().currentProject;
      expect(project?.assets['test-asset-1']).toEqual(mockAsset);
    });

    it('should remove an asset and its layers', () => {
      const { addAsset, addLayer, removeAsset } = useAppStore.getState();

      const mockAsset = {
        id: 'test-asset-1',
        name: 'test.png',
        kind: 'image' as const,
        width: 100,
        height: 100,
        src: 'blob:test-url',
        bitmap: {} as ImageBitmap,
      };

      addAsset(mockAsset);
      addLayer('test-asset-1');

      // Verify asset and layer were added
      let project = useAppStore.getState().currentProject;
      expect(project?.assets['test-asset-1']).toBeDefined();
      expect(project?.layers.length).toBe(1);

      removeAsset('test-asset-1');

      // Verify asset and layer were removed
      project = useAppStore.getState().currentProject;
      expect(project?.assets['test-asset-1']).toBeUndefined();
      expect(project?.layers.length).toBe(0);
    });
  });

  describe('Layer Management', () => {
    beforeEach(() => {
      const { createNewProject, addAsset } = useAppStore.getState();
      createNewProject('Test Project');

      const mockAsset = {
        id: 'test-asset-1',
        name: 'test.png',
        kind: 'image' as const,
        width: 100,
        height: 100,
        src: 'blob:test-url',
        bitmap: {} as ImageBitmap,
      };

      addAsset(mockAsset);
    });

    it('should add a layer', () => {
      const { addLayer } = useAppStore.getState();

      const layerId = addLayer('test-asset-1');

      const project = useAppStore.getState().currentProject;
      expect(project?.layers.length).toBe(1);
      expect(project?.layers[0].id).toBe(layerId);
      expect(project?.layers[0].assetId).toBe('test-asset-1');
      expect(project?.layers[0].visible).toBe(true);
      expect(project?.layers[0].locked).toBe(false);
    });

    it('should update layer transform', () => {
      const { addLayer, updateLayerTransform } = useAppStore.getState();

      const layerId = addLayer('test-asset-1');
      updateLayerTransform(layerId, {
        x: 100,
        y: 200,
        opacity: 0.5,
      });

      const project = useAppStore.getState().currentProject;
      const layer = project?.layers[0];
      expect(layer?.transform.x).toBe(100);
      expect(layer?.transform.y).toBe(200);
      expect(layer?.transform.opacity).toBe(0.5);
    });

    it('should select and deselect layers', () => {
      const { addLayer, selectLayer, deselectLayers } = useAppStore.getState();

      const layerId = addLayer('test-asset-1');
      selectLayer(layerId);

      let canvas = useAppStore.getState().canvas;
      expect(canvas.selectedLayerIds).toContain(layerId);

      deselectLayers();

      canvas = useAppStore.getState().canvas;
      expect(canvas.selectedLayerIds).toEqual([]);
    });
  });

  describe('Timeline', () => {
    it('should control playback', () => {
      const { play, pause, stop, setCurrentTime } = useAppStore.getState();

      // Test play
      play();
      expect(useAppStore.getState().timeline.isPlaying).toBe(true);

      // Test pause
      pause();
      expect(useAppStore.getState().timeline.isPlaying).toBe(false);

      // Test time setting
      setCurrentTime(1000);
      expect(useAppStore.getState().timeline.currentTime).toBe(1000);

      // Test stop
      stop();
      expect(useAppStore.getState().timeline.isPlaying).toBe(false);
      expect(useAppStore.getState().timeline.currentTime).toBe(0);
    });

    it('should clamp speed values', () => {
      const { setSpeed } = useAppStore.getState();

      // Test normal speed
      setSpeed(1.5);
      expect(useAppStore.getState().timeline.speed).toBe(1.5);

      // Test minimum clamp
      setSpeed(0.05);
      expect(useAppStore.getState().timeline.speed).toBe(0.1);

      // Test maximum clamp
      setSpeed(5);
      expect(useAppStore.getState().timeline.speed).toBe(2);
    });
  });
});
