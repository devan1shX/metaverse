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
  {
    id: "conference-hall",
    title: "Conference Hall",
    image: "/images/space-2.png",
  },
];

const themes = [
  { id: "skyscraper", name: "Skyscraper", icon: Building },
  { id: "industrial", name: "Industrial", icon: Building },
  { id: "courtyard", name: "Courtyard", icon: Trees },
  { id: "cozy", name: "Cozy", icon: Home },
];

interface CreateSpaceCustomizeProps {
  selectedMapId: string;
  onBack: () => void;
  onConfirm: (customization: { size: number; theme: string }) => void;
}

export default function CreateSpaceCustomize({
  selectedMapId,
  onBack,
  onConfirm,
}: CreateSpaceCustomizeProps) {
  const [size, setSize] = useState(25);
  const [selectedTheme, setSelectedTheme] = useState("cozy");

  const mapInfo = mapsData.find((map) => map.id === selectedMapId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ size, theme: selectedTheme });
  };

  if (!mapInfo) {
    return (
      <div className="card p-8 text-center max-w-md">
        <p className="text-red-600">Error: Map details not found.</p>
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
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Customize Your Space
        </h1>
        <p className="text-gray-600">
          Select the size and theme of your office. You can change this later!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Map Preview */}
          <div className="aspect-video w-full rounded-lg overflow-hidden relative border-2 border-gray-200">
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
                <label className="font-semibold text-gray-900">Map Size</label>
                <span className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Map Theme Selection */}
            <div>
              <label className="font-semibold text-gray-900 mb-3 block">Map Theme</label>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  const isActive = selectedTheme === theme.id;
                  return (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-50 border-indigo-500"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? "text-indigo-600" : "text-gray-400"
                        }`}
                      />
                      <span className={`text-sm font-medium ${
                        isActive ? "text-indigo-900" : "text-gray-700"
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
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
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
