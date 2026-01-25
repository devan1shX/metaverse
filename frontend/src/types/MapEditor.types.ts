// Map Editor TypeScript Types

export interface TilesetConfig {
    id: string;
    name: string;
    image: string;
    imageWidth: number;
    imageHeight: number;
    tileWidth: number;
    tileHeight: number;
    tileCount: number;
    columns: number;
    collisionTiles?: number[]; // Array of tile IDs that have collision
}

export interface TileData {
    tileId: number; // Tile ID within the tileset (1-based)
    tilesetIndex: number; // Which tileset this tile belongs to (0-based)
}

export interface Layer {
    id: number;
    name: string;
    type: string;
    visible: boolean;
    opacity: number; // 0-1 range
    data: (TileData | null)[]; // Array of tile data or null for empty tiles
    width: number;
    height: number;
}

export interface MapData {
    width: number; // Map width in tiles
    height: number; // Map height in tiles
    tilewidth: number; // Tile width in pixels
    tileheight: number; // Tile height in pixels
    layers: Layer[];
    tilesets: TilesetConfig[];
}

export interface EditorState {
    currentTool: "brush" | "eraser" | "fill" | "select";
    selectedTileId: number | null;
    selectedLayer: number;
    zoom: number;
    showGrid: boolean;
    mapData: MapData;
}

export interface TilePosition {
    x: number;
    y: number;
}

export interface SelectedTiles {
    tiles: { tileId: number; row: number; col: number }[][];
    width: number;
    height: number;
}
