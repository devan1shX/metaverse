// Map Export Utility - Converts editor format to Tiled JSON

import { MapData, TileData } from "@/types/MapEditor.types";

export interface TiledMapJSON {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    tilesets: TiledTileset[];
    layers: TiledLayer[];
    orientation: string;
    renderorder: string;
    version: string;
    tiledversion: string;
    infinite: boolean;
    nextlayerid: number;
    nextobjectid: number;
}

interface TiledTileset {
    firstgid: number;
    source?: string;
    name: string;
    image: string;
    imagewidth: number;
    imageheight: number;
    tilewidth: number;
    tileheight: number;
    tilecount: number;
    columns: number;
    margin: number;
    spacing: number;
    tiles?: Array<{
        id: number;
        properties?: Array<{
            name: string;
            type: string;
            value: boolean | number | string;
        }>;
    }>;
}

interface TiledLayer {
    id: number;
    name: string;
    type: string;
    visible: boolean;
    opacity: number;
    data: number[];
    width: number;
    height: number;
    x: number;
    y: number;
    properties?: Array<{
        name: string;
        type: string;
        value: boolean | number | string;
    }>;
}

export function exportToTiledJSON(mapData: MapData, mapName: string = "custom_map"): TiledMapJSON {
    // Convert TileData array to simple number array for Tiled format
    // We need to convert our multi-tileset format to Tiled's global tile ID (GID) format

    const convertedLayers: TiledLayer[] = mapData.layers.map((layer) => {
        const tiledData: number[] = new Array(mapData.width * mapData.height).fill(0);

        layer.data.forEach((tileData: TileData | null, index: number) => {
            if (tileData && tileData.tileId > 0) {
                // Calculate global tile ID (GID) based on tileset
                let gid = 0;
                let currentFirstGid = 1;

                for (let i = 0; i <= tileData.tilesetIndex; i++) {
                    if (i === tileData.tilesetIndex) {
                        gid = currentFirstGid + (tileData.tileId - 1);
                    } else {
                        currentFirstGid += mapData.tilesets[i].tileCount;
                    }
                }

                tiledData[index] = gid;
            }
        });

        return {
            id: layer.id,
            name: layer.name,
            type: layer.type,
            visible: layer.visible,
            opacity: layer.opacity,
            data: tiledData,
            width: layer.width,
            height: layer.height,
            x: 0,
            y: 0,
            // Add collision property based on layer name
            // Ground layer = no collision, all others = collision
            properties: layer.name.toLowerCase() === "ground" ? undefined : [{
                name: "collides",
                type: "bool",
                value: true
            }]
        };
    });

    // Convert tilesets with firstgid calculations and collision properties
    const tiledTilesets: TiledTileset[] = [];
    let currentFirstGid = 1;

    mapData.tilesets.forEach((tileset) => {
        const tilesetData: TiledTileset = {
            firstgid: currentFirstGid,
            name: tileset.name,
            image: tileset.image,
            imagewidth: tileset.imageWidth,
            imageheight: tileset.imageHeight,
            tilewidth: tileset.tileWidth,
            tileheight: tileset.tileHeight,
            tilecount: tileset.tileCount,
            columns: tileset.columns,
            margin: 0,
            spacing: 0,
        };

        // Add collision properties for tiles that have collision enabled
        if (tileset.collisionTiles && tileset.collisionTiles.length > 0) {
            tilesetData.tiles = tileset.collisionTiles.map(tileId => ({
                id: tileId - 1, // Tiled uses 0-based IDs for tile properties
                properties: [{
                    name: "collides",
                    type: "bool",
                    value: true
                }]
            }));
        }

        tiledTilesets.push(tilesetData);
        currentFirstGid += tileset.tileCount;
    });

    return {
        width: mapData.width,
        height: mapData.height,
        tilewidth: mapData.tilewidth,
        tileheight: mapData.tileheight,
        tilesets: tiledTilesets,
        layers: convertedLayers,
        orientation: "orthogonal",
        renderorder: "right-down",
        version: "1.10",
        tiledversion: "1.10.2",
        infinite: false,
        nextlayerid: mapData.layers.length + 1,
        nextobjectid: 1,
    };
}

export function downloadMapJSON(mapData: MapData, filename: string = "my_map") {
    const tiledJSON = exportToTiledJSON(mapData, filename);
    const jsonString = JSON.stringify(tiledJSON, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function saveMapToPublic(mapData: MapData, filename: string = "my_map") {
    // This generates the JSON that you can manually copy to /public/map-editor/maps/
    const tiledJSON = exportToTiledJSON(mapData, filename);
    console.log("Map JSON (copy this to /public/map-editor/maps/):");
    console.log(JSON.stringify(tiledJSON, null, 2));
    return tiledJSON;
}
