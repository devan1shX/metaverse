// Define simple interfaces since we don't have access to the exact types folder yet.
export interface TiledLayerJSON {
  id: number;
  name: string;
  type: string;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data?: number[];
  draworder?: string;
  objects?: any[];
}

export interface TiledMapJSON {
  compressionlevel: number;
  height: number;
  infinite: boolean;
  layers: TiledLayerJSON[];
  nextlayerid: number;
  nextobjectid: number;
  orientation: string;
  renderorder: string;
  tiledversion: string;
  tileheight: number;
  tilewidth: number;
  tilesets: any[];
  type: string;
  version: string;
  width: number;
}

// The base URL for dynamic prefabs
const PREFAB_BASE_URL = "/maps/dynamic_maps";

/**
 * Fetches a JSON prefab from the public folder.
 */
async function fetchPrefab(path: string): Promise<TiledMapJSON> {
  const response = await fetch(`${PREFAB_BASE_URL}/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load prefab: ${path}`);
  }
  return response.json();
}

/**
 * Creates an empty tile layer filled with a specific tile ID (or 0 for empty)
 */
function createEmptyLayer(id: number, name: string, width: number, height: number, fillTileId: number = 0): TiledLayerJSON {
  return {
    id,
    name,
    type: "tilelayer",
    visible: true,
    opacity: 1,
    x: 0,
    y: 0,
    width,
    height,
    data: new Array(width * height).fill(fillTileId),
  };
}

/**
 * Stamps a smaller prefab's layer data into a larger map's layer data at (startX, startY)
 */
function stampPrefabLayer(
  targetData: number[],
  targetWidth: number,
  targetHeight: number,
  prefabData: number[],
  prefabWidth: number,
  prefabHeight: number,
  startX: number,
  startY: number
) {
  for (let y = 0; y < prefabHeight; y++) {
    for (let x = 0; x < prefabWidth; x++) {
      const destX = startX + x;
      const destY = startY + y;
      
      // Bounds check to prevent wrap-around corruption
      if (destX >= 0 && destX < targetWidth && destY >= 0 && destY < targetHeight) {
        const targetIndex = destY * targetWidth + destX;
        const prefabIndex = y * prefabWidth + x;
        
        // Only stamp non-zero (non-empty) tiles
        if (prefabData[prefabIndex] !== 0) {
          targetData[targetIndex] = prefabData[prefabIndex];
        }
      }
    }
  }
}

/**
 * Generates a dynamic office map based on the required number of employees.
 */
export async function generateOfficeMap(
  employeeCount: number, 
  includeMeetingRoom: boolean = false,
  includeLounge: boolean = false
): Promise<TiledMapJSON> {
  // 1. Fetch the prefabs
  const deskPrefab = await fetchPrefab("desk/office-desk.json");
  const meetingPrefab = includeMeetingRoom ? await fetchPrefab("meeting-room/meeting-room.json") : null;
  const loungePrefab = includeLounge ? await fetchPrefab("lounge/lounge.json") : null;

  const deskW = deskPrefab.width; // 10
  const deskH = deskPrefab.height; // 10

  // 2. Calculate the Grid size needed for desks
  let deskCols = Math.ceil(Math.sqrt(employeeCount));
  let deskRows = Math.ceil(employeeCount / deskCols);

  if (deskCols < 1) deskCols = 1;
  if (deskRows < 1) deskRows = 1;

  // 3. Spacing Constants
  const verticalDeskStep = 11; // 10 Prefab height + 1 explicit visual space
  const horizontalDeskStep = 11; // 10 Prefab width + 1 explicit visual space

  const meetingW = meetingPrefab ? meetingPrefab.width : 0;
  const meetingH = meetingPrefab ? meetingPrefab.height : 0;
  const loungeW = loungePrefab ? loungePrefab.width : 0;
  const loungeH = loungePrefab ? loungePrefab.height : 0;

  // 4. Tileset and GID management
  const allTilesets: any[] = [];
  let nextFirstGid = 1;

  const fixTilesetPaths = (tilesets: any[], basePath: string) => {
    return tilesets.map(ts => {
      let newImage = ts.image;
      if (newImage && !newImage.startsWith('/') && !newImage.startsWith('http')) {
        // Remove ANY combination of '../', './', or the basePath itself to avoid duplication
        // Example: "../lounge/assets/bookshelf.png" with basePath "lounge" -> "assets/bookshelf.png"
        let cleanPath = newImage.replace(/^(\.\.?\/)+/, '');
        
        // Robust segment check: if the first part of the path is already the basePath, strip it.
        const segments = cleanPath.split(/[\\/]/);
        if (segments.length > 0 && segments[0] === basePath) {
          cleanPath = segments.slice(1).join('/');
        }
        
        newImage = `${PREFAB_BASE_URL}/${basePath}/${cleanPath}`;
      }
      const fixedTs = { ...ts, name: `${basePath}_${ts.name}`, firstgid: nextFirstGid, image: newImage };
      allTilesets.push(fixedTs);
      nextFirstGid += ts.tilecount;
      return fixedTs;
    });
  };

  const deskTilesets = fixTilesetPaths(deskPrefab.tilesets, "desk");
  const meetingTilesets = meetingPrefab ? fixTilesetPaths(meetingPrefab.tilesets, "meeting-room") : [];
  const loungeTilesets = loungePrefab ? fixTilesetPaths(loungePrefab.tilesets, "lounge") : [];

  const remapLayerData = (data: number[] | undefined, oldTilesets: any[], newTilesets: any[]) => {
    if (!data) return undefined;
    const newData = [...data];
    
    // Create sorted copies mapping old tilesets to new ones, sorted by firstgid descending
    // Because GIDs are linear, we must check the highest contiguous tilesets first
    const mappedTilesets = oldTilesets.map((oldTs, i) => ({ oldTs, newTs: newTilesets[i] }))
                                      .sort((a, b) => b.oldTs.firstgid - a.oldTs.firstgid);
    
    for (let i = 0; i < newData.length; i++) {
        let gid = newData[i];
        if (gid === 0) continue;

        // Tiled encodes flip flags in the highest 3 bits of a 32-bit integer.
        // We use Math addition instead of bitwise OR to avoid signed integer truncation
        const flipH = (gid >= 2147483648) ? 1 : 0;
        if (flipH) gid -= 2147483648;
        
        const flipV = (gid >= 1073741824) ? 1 : 0;
        if (flipV) gid -= 1073741824;
        
        const flipD = (gid >= 536870912) ? 1 : 0;
        if (flipD) gid -= 536870912;
        
        const realGid = gid;
        if (realGid === 0) continue;

        for (const pair of mappedTilesets) {
            if (realGid >= pair.oldTs.firstgid) {
                const localId = realGid - pair.oldTs.firstgid;
                let newRealGid = pair.newTs.firstgid + localId;
                
                // Reconstruct flags
                let reconstructedGid = newRealGid;
                if (flipH) reconstructedGid += 2147483648;
                if (flipV) reconstructedGid += 1073741824;
                if (flipD) reconstructedGid += 536870912;
                
                newData[i] = reconstructedGid;
                break;
            }
        }
    }
    return newData;
  };

  /**
   * Scans a prefab's layers to find the highest Y coordinate that actually contains a tile.
   */
  const findOccupiedHeight = (layers: TiledLayerJSON[], width: number, height: number): number => {
    let maxHeight = 0;
    for (const layer of layers) {
      if (layer.type !== "tilelayer" || !layer.data) continue;
      for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
          if (layer.data[y * width + x] !== 0) {
            if (y + 1 > maxHeight) maxHeight = y + 1;
            break;
          }
        }
        if (maxHeight > y) break; 
      }
    }
    return maxHeight > 0 ? maxHeight : height;
  };

  // 3b. Calculate actual dimensions for tighter stacking
  const actualMeetingH = meetingPrefab ? findOccupiedHeight(meetingPrefab.layers, meetingW, meetingH) : 0;
  const actualLoungeH = loungePrefab ? findOccupiedHeight(loungePrefab.layers, loungeW, loungeH) : 0;

  // Horizontal Layout calculations
  const paddingBetweenSections = 4; // Gap between rooms
  const paddingTilesOuter = 6; // Padding on edges

  // Desks take up horizontal width: (deskCols * horizontalDeskStep)
  // Desk row height takes up: (deskRows * verticalDeskStep)
  const desksAreaWidth = deskCols * horizontalDeskStep;
  const desksAreaHeight = deskRows * verticalDeskStep;

  let totalWidth = 0;
  let maxHeight = desksAreaHeight;

  // Lounge (Left)
  if (loungePrefab) {
    totalWidth += loungeW;
    if (actualLoungeH > maxHeight) maxHeight = actualLoungeH;
  }

  // Desks (Middle)
  if (loungePrefab) totalWidth += paddingBetweenSections;
  totalWidth += desksAreaWidth;

  // Meeting Room (Right)
  if (meetingPrefab) {
    totalWidth += paddingBetweenSections;
    totalWidth += meetingW;
    if (actualMeetingH > maxHeight) maxHeight = actualMeetingH;
  }

  const mapWidth = totalWidth + (paddingTilesOuter * 2);
  const mapHeight = maxHeight + (paddingTilesOuter * 2);

  // 5. Initialize the new empty layers
  const groundLayer = createEmptyLayer(1, "Ground", mapWidth, mapHeight, 0);
  const wallsLayer = createEmptyLayer(2, "Walls", mapWidth, mapHeight, 0);
  const objectLayer = createEmptyLayer(3, "Object", mapWidth, mapHeight, 0);
  const aboveObjectLayer = createEmptyLayer(4, "Above Object", mapWidth, mapHeight, 0);

  // Use horizontal placement
  let currentXOffset = paddingTilesOuter; 
  const generatedObjects: any[] = [];
  let nextObjectId = 2; // 1 is reserved for Spawn Point usually

  // 6. Stamp Lounge Area (LEFT)
  if (loungePrefab && loungePrefab.layers) {
    const loungeStartX = currentXOffset;
    const loungeStartY = paddingTilesOuter + Math.floor((maxHeight - actualLoungeH) / 2); // Vertically centered

    for (const pLayer of loungePrefab.layers) {
      if (pLayer.type !== "tilelayer" || !pLayer.data) continue;
      const remappedData = remapLayerData(pLayer.data, loungePrefab.tilesets, loungeTilesets);
      if (!remappedData) continue;

      let tLayer: TiledLayerJSON | undefined;
      if (pLayer.name === "Ground") tLayer = groundLayer;
      if (pLayer.name === "Walls") tLayer = wallsLayer;
      if (pLayer.name === "Object") tLayer = objectLayer;
      if (pLayer.name === "Above Object") tLayer = aboveObjectLayer;

      if (tLayer && tLayer.data) {
        stampPrefabLayer(tLayer.data, mapWidth, mapHeight, remappedData, loungeW, loungeH, loungeStartX, loungeStartY);
      }
    }

    // Scan for chairs in the lounge
    const loungeObjectLayer = loungePrefab.layers.find(l => l.name === "Object");
    if (loungeObjectLayer && loungeObjectLayer.data) {
      for (let y = 0; y < loungeH; y++) {
        for (let x = 0; x < loungeW; x++) {
          let gid = loungeObjectLayer.data[y * loungeW + x];
          if (gid === 0) continue;

          if (gid >= 2147483648) gid -= 2147483648;
          if (gid >= 1073741824) gid -= 1073741824;
          if (gid >= 536870912) gid -= 536870912;

          const ts = loungePrefab.tilesets.find((t: any) => gid >= t.firstgid && gid < t.firstgid + t.tilecount);
          if (ts && (ts.name.toLowerCase().includes('chair') || ts.name.toLowerCase().includes('couch'))) {
            generatedObjects.push({
              height: 16, width: 16, id: nextObjectId++, name: "Chair", type: "Chair", visible: true,
              x: (loungeStartX + x) * 16, y: (loungeStartY + y) * 16
            });
          }
        }
      }
    }

    currentXOffset += loungeW + paddingBetweenSections;
  }

  // 7. Stamp Desks (MIDDLE)
  let desksPlaced = 0;
  const deskBlockStartX = currentXOffset;
  const deskStartYBase = paddingTilesOuter + Math.floor((maxHeight - desksAreaHeight) / 2);

  for (let r = 0; r < deskRows; r++) {
    for (let c = 0; c < deskCols; c++) {
      if (desksPlaced >= employeeCount) break;

      const startX = deskBlockStartX + (c * horizontalDeskStep);
      const startY = deskStartYBase + (r * verticalDeskStep);

      for (const pLayer of deskPrefab.layers) {
        if (pLayer.type !== "tilelayer" || !pLayer.data) continue;
        const remappedData = remapLayerData(pLayer.data, deskPrefab.tilesets, deskTilesets);
        if (!remappedData) continue;

        let tLayer: TiledLayerJSON | undefined;
        if (pLayer.name === "Ground") tLayer = groundLayer;
        if (pLayer.name === "Walls") tLayer = wallsLayer;
        if (pLayer.name === "Object") tLayer = objectLayer;
        if (pLayer.name === "Above Object") tLayer = aboveObjectLayer;

        if (tLayer && tLayer.data) {
          stampPrefabLayer(tLayer.data, mapWidth, mapHeight, remappedData, deskW, deskH, startX, startY);
        }
      }

      // Add the desk chair to interactive zones
      generatedObjects.push({
        height: 16, width: 16, id: nextObjectId++, name: "Chair", type: "Chair", visible: true,
        x: (startX + 2) * 16, y: (startY + 4) * 16 
      });

      desksPlaced++;
    }
  }

  // Spawn point logic needs deskBlockStartX.
  const spawnPointX = (deskBlockStartX + (desksAreaWidth / 2)) * 16;
  const spawnPointY = (paddingTilesOuter + maxHeight) * 16 - 32;

  currentXOffset += desksAreaWidth + paddingBetweenSections;

  // 8. Stamp Meeting Room (RIGHT)
  if (meetingPrefab && meetingPrefab.layers) {
    const meetingStartX = currentXOffset;
    const meetingStartY = paddingTilesOuter + Math.floor((maxHeight - actualMeetingH) / 2); // Vertically centered

    for (const pLayer of meetingPrefab.layers) {
      if (pLayer.type !== "tilelayer" || !pLayer.data) continue;
      const remappedData = remapLayerData(pLayer.data, meetingPrefab.tilesets, meetingTilesets);
      if (!remappedData) continue;

      let tLayer: TiledLayerJSON | undefined;
      if (pLayer.name === "Ground") tLayer = groundLayer;
      if (pLayer.name === "Walls") tLayer = wallsLayer;
      if (pLayer.name === "Object") tLayer = objectLayer;
      if (pLayer.name === "Above Object") tLayer = aboveObjectLayer;

      if (tLayer && tLayer.data) {
        stampPrefabLayer(tLayer.data, mapWidth, mapHeight, remappedData, meetingW, meetingH, meetingStartX, meetingStartY);
      }
    }
    
    // Scan for chairs in the meeting room
    const meetingRoomLayer = meetingPrefab.layers.find(l => l.name === "Object");
    if (meetingRoomLayer && meetingRoomLayer.data) {
      for (let y = 0; y < meetingH; y++) {
        for (let x = 0; x < meetingW; x++) {
          let gid = meetingRoomLayer.data[y * meetingW + x];
          if (gid === 0) continue;
          
          if (gid >= 2147483648) gid -= 2147483648;
          if (gid >= 1073741824) gid -= 1073741824;
          if (gid >= 536870912) gid -= 536870912;
          
          // Find if this GID belongs to a chair tileset
          const ts = meetingPrefab.tilesets.find((t: any) => gid >= t.firstgid && gid < t.firstgid + t.tilecount);
          if (ts && ts.name.toLowerCase().includes('chair')) {
            generatedObjects.push({
              height: 16, width: 16, id: nextObjectId++, name: "Chair", type: "Chair", visible: true,
              x: (meetingStartX + x) * 16, y: (meetingStartY + y) * 16
            });
          }
        }
      }
    }
    
    currentXOffset += meetingW; 
  }

  // 9. Interactive Objects (Spawn Point)
  const interactiveLayer: TiledLayerJSON = {
    draworder: "topdown",
    id: 15,
    name: "Interactive Objects",
    objects: [
      {
        height: 0,
        id: 1,
        name: "Spawn Point",
        point: true,
        rotation: 0,
        type: "",
        visible: true,
        width: 0,
        x: spawnPointX,
        y: spawnPointY 
      },
      ...generatedObjects
    ],
    opacity: 1,
    type: "objectgroup",
    visible: true,
    x: 0,
    y: 0
  };

  // 10. Assemble and Return
  const mapId = `dynamic-${Date.now()}`;
  return {
    compressionlevel: -1,
    height: mapHeight,
    infinite: false,
    layers: [
      groundLayer,
      wallsLayer,
      objectLayer,
      interactiveLayer,
      aboveObjectLayer
    ],
    nextlayerid: 20,
    nextobjectid: 2,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.10",
    tileheight: 16,
    tilewidth: 16,
    tilesets: allTilesets,
    type: "map",
    version: "1.10",
    width: mapWidth,
    customMapMetadata: {
      mapId: mapId,
      name: `Dynamic Team of ${employeeCount}${includeMeetingRoom ? " + Meeting" : ""}${includeLounge ? " + Lounge" : ""}`
    }
  } as TiledMapJSON;
}
