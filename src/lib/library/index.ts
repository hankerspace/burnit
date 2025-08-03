import type { GifAsset } from '../../types';
import { decodeGif } from '../gif/decode';

export interface LibraryCategory {
  id: string;
  name: string;
  assets: GifAsset[];
}

export interface AssetLibrary {
  categories: LibraryCategory[];
  isLoaded: boolean;
  isLoading: boolean;
}

export interface LibraryAssetInfo {
  filename: string;
  category: string;
  displayName: string;
}

// Asset library configuration
const LIBRARY_ASSETS: LibraryAssetInfo[] = [
  { filename: 'fireA.gif', category: 'fire', displayName: 'Fire A' },
  { filename: 'fireB.gif', category: 'fire', displayName: 'Fire B' },
  { filename: 'fireC.gif', category: 'fire', displayName: 'Fire C' },
  { filename: 'fireD.gif', category: 'fire', displayName: 'Fire D' },
  { filename: 'smokeA.gif', category: 'smoke', displayName: 'Smoke A' },
  { filename: 'smokeB.gif', category: 'smoke', displayName: 'Smoke B' },
];

class LibraryManager {
  private library: AssetLibrary = {
    categories: [],
    isLoaded: false,
    isLoading: false,
  };

  private listeners: Set<(library: AssetLibrary) => void> = new Set();

  async loadLibrary(): Promise<AssetLibrary> {
    if (this.library.isLoaded || this.library.isLoading) {
      return this.library;
    }

    this.library.isLoading = true;
    this.notifyListeners();

    try {
      const categoryMap = new Map<string, GifAsset[]>();

      // Load all assets
      const loadPromises = LIBRARY_ASSETS.map(async (assetInfo) => {
        try {
          const response = await fetch(`/src/assets/library/${assetInfo.filename}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${assetInfo.filename}: ${response.statusText}`);
          }

          const blob = await response.blob();
          const file = new File([blob], assetInfo.filename, { type: 'image/gif' });
          
          const gifAsset = await decodeGif(file);
          // Override the generated name with our display name
          gifAsset.name = assetInfo.displayName;

          // Group by category
          if (!categoryMap.has(assetInfo.category)) {
            categoryMap.set(assetInfo.category, []);
          }
          categoryMap.get(assetInfo.category)!.push(gifAsset);
        } catch (error) {
          console.error(`Failed to load library asset ${assetInfo.filename}:`, error);
        }
      });

      await Promise.all(loadPromises);

      // Convert map to categories array
      this.library.categories = Array.from(categoryMap.entries()).map(([categoryId, assets]) => ({
        id: categoryId,
        name: this.formatCategoryName(categoryId),
        assets: assets.sort((a, b) => a.name.localeCompare(b.name)),
      }));

      this.library.isLoaded = true;
      this.library.isLoading = false;
      this.notifyListeners();

      console.log(`Library loaded with ${this.library.categories.length} categories and ${this.getTotalAssetCount()} assets`);
      
      return this.library;
    } catch (error) {
      this.library.isLoading = false;
      this.notifyListeners();
      throw error;
    }
  }

  getLibrary(): AssetLibrary {
    return { ...this.library };
  }

  getCategoryAssets(categoryId: string): GifAsset[] {
    const category = this.library.categories.find(cat => cat.id === categoryId);
    return category ? [...category.assets] : [];
  }

  getAllAssets(): GifAsset[] {
    return this.library.categories.flatMap(category => category.assets);
  }

  getAssetById(assetId: string): GifAsset | undefined {
    return this.getAllAssets().find(asset => asset.id === assetId);
  }

  subscribe(listener: (library: AssetLibrary) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private formatCategoryName(categoryId: string): string {
    return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
  }

  private getTotalAssetCount(): number {
    return this.library.categories.reduce((total, category) => total + category.assets.length, 0);
  }

  private notifyListeners(): void {
    const librarySnapshot = this.getLibrary();
    this.listeners.forEach(listener => {
      try {
        listener(librarySnapshot);
      } catch (error) {
        console.error('Error in library listener:', error);
      }
    });
  }

  dispose(): void {
    // Clean up all loaded assets
    this.getAllAssets().forEach(asset => {
      asset.frames.forEach(frame => {
        if (frame.bitmap) {
          frame.bitmap.close();
        }
      });
      if (asset.src.startsWith('blob:')) {
        URL.revokeObjectURL(asset.src);
      }
    });

    this.library.categories = [];
    this.library.isLoaded = false;
    this.library.isLoading = false;
    this.listeners.clear();
  }
}

// Singleton instance
export const libraryManager = new LibraryManager();

// Convenience functions
export const loadLibrary = () => libraryManager.loadLibrary();
export const getLibrary = () => libraryManager.getLibrary();
export const getCategoryAssets = (categoryId: string) => libraryManager.getCategoryAssets(categoryId);
export const getAllLibraryAssets = () => libraryManager.getAllAssets();
export const getLibraryAssetById = (assetId: string) => libraryManager.getAssetById(assetId);
export const subscribeToLibrary = (listener: (library: AssetLibrary) => void) => libraryManager.subscribe(listener);