"use client";

import { useState, useRef, ReactNode } from "react";
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
  const [error, setError] = useState<ReactNode | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Create a temp object URL to check dimensions
      const objectUrl = URL.createObjectURL(selectedFile);
      const img = new Image();
      img.onload = () => {
        // Check for dimensions of 16 (Multiples of 16)
        if (img.width % 16 !== 0 || img.height % 16 !== 0) {
           setError(
            <span>
              Image dimensions must be multiples of 16 (e.g. 16, 32, 48...).
              <br />
              Your image is {img.width}x{img.height} px.
              <br />
              <span className="text-slate-500 text-[10px] mt-1 block">
                Tilesets work best with standard grids.
              </span>
              Please resize it to a multiple of 16.
            </span>
          );
          URL.revokeObjectURL(objectUrl);
          setFile(null);
          setPreview(null);
          return;
        }

        // limit 1024x1024 (Increased from 512 as 512 is small for tilesets)
        if (img.width > 512 || img.height > 512) {
          setError(
            <span>
              Image is too large ({img.width}x{img.height}). Max allowed is 512x512. 
            </span>
          );
          URL.revokeObjectURL(objectUrl);
          setFile(null);
          setPreview(null);
          return;
        }

        // limit min size
        if (img.width < 16 || img.height < 16) {
             setError("Image is too small. Minimum size is 16x16.");
             URL.revokeObjectURL(objectUrl);
             setFile(null);
             setPreview(null);
             return;
        }

        // If valid
        setFile(selectedFile);
        setPreview(objectUrl);
        setName(selectedFile.name.split('.')[0]); // Default name from filename
        setError(null);
      };
      
      img.onerror = () => {
          setError("Failed to load image.");
          URL.revokeObjectURL(objectUrl);
      };

      img.src = objectUrl;
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
    <div className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-shell w-96 max-w-full overflow-hidden">
        <div className="modal-header flex items-center justify-between px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
            <Upload className="h-4 w-4 text-[var(--accent-strong)]" />
            Upload Custom Tileset
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* File Input */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed p-6 transition-all ${
              preview ? "border-[rgba(239,188,130,0.22)] bg-[rgba(215,163,102,0.08)]" : "border-[var(--border-default)] bg-white/[0.03] hover:border-[var(--border-strong)] hover:bg-white/[0.05]"
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
                <div className="group absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/10">
                   <span className="rounded-full bg-[rgba(14,19,28,0.85)] px-3 py-1 text-xs text-[var(--text-primary)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">Change Image</span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(215,163,102,0.14)] text-[var(--accent-strong)]">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Click to upload image</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">PNG or JPG recommended</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="surface-label mb-1 block">Tileset Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field rounded-[18px] px-4 py-3 text-sm"
                placeholder="e.g. My Dungeon Walls"
              />
            </div>

            
          </div>
          
          {error && (
            <div className="rounded-[18px] border border-[rgba(239,124,120,0.22)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="btn-primary w-full rounded-full"
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
