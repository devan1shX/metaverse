"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, CheckCircle, User, Palette } from "lucide-react";

const presetAvatars = ["avatar-2.png", "avatar-4.png", "avatar-5.png"];
const HAIR_OPTIONS = 8;
const OUTFIT_OPTIONS = 6;
const BASE_OPTIONS = 6;

interface AvatarSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatarUrl: string) => void;
  currentAvatar: string;
}

export function AvatarSelection({
  isOpen,
  onClose,
  onSave,
  currentAvatar,
}: AvatarSelectionProps) {
  const [selected, setSelected] = useState(currentAvatar || "/avatars/avatar-2.png");
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  // Custom configuration state
  const [baseId, setBaseId] = useState(0);
  const [hairId, setHairId] = useState(0);
  const [outfitId, setOutfitId] = useState(1);
  const [customLayerTab, setCustomLayerTab] = useState<"base" | "hair" | "outfit">("base");

  // Sync state when opened / selected changes
  useEffect(() => {
    if (isOpen) {
      if (currentAvatar?.startsWith("/avatars/custom")) {
        setActiveTab("custom");
        setSelected(currentAvatar);
        try {
          const params = new URLSearchParams(currentAvatar.split("?")[1]);
          setBaseId(parseInt(params.get("base") || "0"));
          setHairId(parseInt(params.get("hair") || "0"));
          setOutfitId(parseInt(params.get("outfit") || "1"));
        } catch (e) {
          console.error("Failed to parse avatar URL", e);
        }
      } else {
        setActiveTab("presets");
        setSelected(currentAvatar || "/avatars/avatar-2.png");
      }
    }
  }, [currentAvatar, isOpen]);

  // Re-generate custom URL whenever layers change
  useEffect(() => {
    if (activeTab === "custom") {
      setSelected(`/avatars/custom?base=${baseId}&hair=${hairId}&outfit=${outfitId}`);
    }
  }, [baseId, hairId, outfitId, activeTab]);

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  if (!isOpen) return null;

  const renderPreview = (scale: number, b = baseId, h = hairId, o = outfitId) => (
    <div className="relative overflow-hidden" style={{ width: 32 * scale, height: 32 * scale }}>
      {/* Base */}
      <div className="absolute inset-0" style={{
        backgroundImage: "url('/avatars/MetroCity/CharacterModel/Character Model.png')",
        backgroundPosition: `0px -${b * 32 * scale}px`,
        backgroundSize: `${768 * scale}px auto`,
        imageRendering: 'pixelated'
      }} />
      {/* Outfit */}
      <div className="absolute inset-0" style={{
        backgroundImage: `url('/avatars/MetroCity/Outfits/Outfit${o}.png')`,
        backgroundPosition: `0px 0px`,
        backgroundSize: `${768 * scale}px auto`,
        imageRendering: 'pixelated'
      }} />
      {/* Hair */}
      <div className="absolute inset-0" style={{
        backgroundImage: "url('/avatars/MetroCity/Hair/Hairs.png')",
        backgroundPosition: `0px -${h * 32 * scale}px`,
        backgroundSize: `${768 * scale}px auto`,
        imageRendering: 'pixelated'
      }} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Choose Your Avatar</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => {
              setActiveTab("presets");
              setSelected(`/avatars/${presetAvatars[0]}`);
            }}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "presets" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 flex flex-row items-center gap-2 ${
              activeTab === "custom" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Palette className="w-4 h-4" />
            Custom (Beta)
          </button>
        </div>

        <div className="min-h-[300px]">
          {activeTab === "presets" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {presetAvatars.map((avatarFile) => {
                const avatarUrl = `/avatars/${avatarFile}`;
                const isSelected = selected === avatarUrl;
                return (
                  <button
                    key={avatarFile}
                    onClick={() => setSelected(avatarUrl)}
                    className={`relative aspect-square rounded-full overflow-hidden border-4 transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-500 scale-110 shadow-lg"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={avatarUrl}
                      alt={avatarFile}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="bg-gray-50"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-indigo-600 drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Preview Panel */}
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-8 border border-gray-100 min-w-[200px]">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center border-4 border-indigo-100 mb-4">
                  {renderPreview(3.5)}
                </div>
                <span className="text-sm font-medium text-gray-500">Live Preview</span>
              </div>

              {/* Controls Panel */}
              <div className="flex-1">
                <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setCustomLayerTab("base")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${customLayerTab === "base" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"}`}>Base</button>
                  <button onClick={() => setCustomLayerTab("hair")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${customLayerTab === "hair" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"}`}>Hair</button>
                  <button onClick={() => setCustomLayerTab("outfit")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${customLayerTab === "outfit" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"}`}>Outfit</button>
                </div>

                <div className="grid grid-cols-4 gap-3 overflow-y-auto max-h-[220px] p-1">
                  {customLayerTab === "base" && Array.from({ length: BASE_OPTIONS }).map((_, i) => (
                    <button key={`base-${i}`} onClick={() => setBaseId(i)} className={`relative flex items-center justify-center p-2 rounded-xl border-2 transition-all ${baseId === i ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                       {renderPreview(1.5, i, 0, 0)}
                    </button>
                  ))}
                  
                  {customLayerTab === "hair" && Array.from({ length: HAIR_OPTIONS }).map((_, i) => (
                    <button key={`hair-${i}`} onClick={() => setHairId(i)} className={`relative flex items-center justify-center p-2 rounded-xl border-2 transition-all ${hairId === i ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                       {renderPreview(1.5, baseId, i, 0)}
                    </button>
                  ))}

                  {customLayerTab === "outfit" && Array.from({ length: OUTFIT_OPTIONS }).map((_, i) => {
                    const mappedId = i + 1;
                    return (
                      <button key={`outfit-${mappedId}`} onClick={() => setOutfitId(mappedId)} className={`relative flex items-center justify-center p-2 rounded-xl border-2 transition-all ${outfitId === mappedId ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                        {renderPreview(1.5, baseId, 0, mappedId)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 btn-success flex items-center justify-center gap-2"
            disabled={!selected || selected === currentAvatar}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

