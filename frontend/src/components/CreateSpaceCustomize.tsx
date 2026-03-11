"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle,
  Building,
  Trees,
  Home,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const mapsData = [
  { id: "corporate-hq", title: "Corporate HQ", image: "/images/space-1.png" },
  { id: "conference-hall", title: "Conference Hall", image: "/images/space-2.png" },
  { id: "office-01", title: "Office Map 1", image: "/images/space-1.png" },
  { id: "office-02", title: "Office Map 2", image: "/images/space-2.png" },
];

const themes = [
  { id: "skyscraper", name: "Skyscraper", icon: Building },
  { id: "industrial", name: "Industrial", icon: Building },
  { id: "courtyard", name: "Courtyard", icon: Trees },
  { id: "cozy", name: "Cozy", icon: Home },
];

interface CreateSpaceCustomizeProps {
  selectedMapId: string;
  thumbnailUrl?: string; // Add prop
  onBack: () => void;
  onConfirm: (customization: { size: number; theme: string }) => void;
}

export default function CreateSpaceCustomize({
  selectedMapId,
  thumbnailUrl,
  onBack,
  onConfirm,
}: CreateSpaceCustomizeProps) {
  const [size, setSize] = useState(25);
  const [selectedTheme, setSelectedTheme] = useState("cozy");

  // Find map info or create default for custom maps
  let mapInfo = mapsData.find((map) => map.id === selectedMapId);
  
  // If it's a custom map (starts with "custom-"), create a default display
  if (!mapInfo && selectedMapId.startsWith('custom-')) {
    mapInfo = {
      id: selectedMapId,
      title: "Custom Map",
      image: thumbnailUrl || "/images/space-1.png", // Use thumbnail if available
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ size, theme: selectedTheme });
  };

  if (!mapInfo) {
    return (
      <div className="card p-8 text-center max-w-md">
        <p className="text-red-600">Error: Invalid map ID: {selectedMapId}</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  const getPeopleRange = (s: number) => {
    if (s <= 25) return "2 - 25";
    if (s <= 50) return "26 - 50";
    if (s <= 75) return "51 - 75";
    return "76 - 100";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-8">
        <p className="surface-label mb-3">Customize</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-2">
          Customize Your Space
        </h1>
        <p className="text-[var(--text-muted)]">
          Select the size and theme of your office. You can change this later!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Map Preview */}
          <div className="relative aspect-video w-full overflow-hidden rounded-[20px] border border-white/10">
            <Image
              src={mapInfo.image}
              alt={mapInfo.title}
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>

          {/* Customization Options */}
          <div className="space-y-6">
            {/* Map Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-[var(--text-primary)]">Map Size</label>
                <span className="badge badge-info">
                  <Users className="w-4 h-4" />
                  {getPeopleRange(size)} people
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[var(--accent)]"
              />
            </div>

            {/* Map Theme Selection */}
            <div>
              <label className="mb-3 block font-semibold text-[var(--text-primary)]">Map Theme</label>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  const isActive = selectedTheme === theme.id;
                  return (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex items-center gap-2 rounded-2xl border p-3 transition-all duration-200 ${
                        isActive
                          ? "border-[rgba(239,188,130,0.24)] bg-[rgba(215,163,102,0.12)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/15"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-soft)]"
                        }`}
                      />
                      <span className={`text-sm font-medium ${
                        isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                      }`}>
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            className="btn-success text-sm flex items-center gap-2"
          >
            <span>Confirm selection</span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
