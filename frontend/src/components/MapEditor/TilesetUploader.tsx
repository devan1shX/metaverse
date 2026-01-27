"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { TilesetConfig } from "@/types/MapEditor.types";

interface TilesetUploaderProps {
  mapName: string;
  onUpload: (newTileset: TilesetConfig) => void;
  onClose: () => void;
}

export default function TilesetUploader({ mapName, onUpload, onClose }: TilesetUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tileSize, setTileSize] = useState(16);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setName(selectedFile.name.split('.')[0]); // Default name from filename
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !name) {
      setError("Please select a file and provide a name.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('mapName', mapName);
      formData.append('file', file);

      const response = await fetch('http://localhost:3000/metaverse/maps/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Upload failed");
      }

      // Calculate details from preview image
      const img = new Image();
      img.src = preview!;
      await new Promise((resolve) => { img.onload = resolve; });

      const newTileset: TilesetConfig = {
        id: `custom_${Date.now()}`,
        name: name,
        image: data.url, // URL from backend
        imageWidth: img.width,
        imageHeight: img.height,
        tileWidth: tileSize,
        tileHeight: tileSize,
        tileCount: Math.floor(img.width / tileSize) * Math.floor(img.height / tileSize),
        columns: Math.floor(img.width / tileSize),
        collisionTiles: [], // Default no collision
      };

      onUpload(newTileset);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-96 max-w-full overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Upload Custom Tileset
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File Input */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              preview ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png, image/jpeg" 
              className="hidden" 
              onChange={handleFileChange}
            />
            
            {preview ? (
              <div className="relative w-full aspect-video flex items-center justify-center">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="max-w-full max-h-32 object-contain rounded shadow-sm" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors group">
                   <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-700 text-xs px-2 py-1 rounded shadow-sm">Change Image</span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">Click to upload image</p>
                <p className="text-xs text-slate-400 mt-1">PNG or JPG recommended</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Tileset Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="e.g. My Dungeon Walls"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Tile Size (px)</label>
              <div className="flex items-center gap-2">
                 <input
                  type="number"
                  value={tileSize}
                  onChange={(e) => setTileSize(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  min="8"
                  max="128"
                  step="8"
                />
                <span className="text-xs text-slate-400 whitespace-nowrap">x {tileSize} px</span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Add Tileset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
