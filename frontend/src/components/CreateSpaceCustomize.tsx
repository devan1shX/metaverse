"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle,
  Rocket,
  Building,
  Trees,
  Home,
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
    return <p className="text-red-500">Error: Map details not found.</p>;
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
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
        Choose your office template
      </h1>
      <p className="text-center text-gray-400 mb-10">
        Select the size and theme of your office. You can change this later!
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid md:grid-cols-2 gap-10 items-center"
      >
        <div className="aspect-video w-full rounded-lg overflow-hidden relative border-4 border-gray-700">
          <Image
            src={mapInfo.image}
            alt={mapInfo.title}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="font-bold text-lg">MAP SIZE</label>
              <span className="text-sm font-medium text-gray-300">
                👥 {getPeopleRange(size)}
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="100" // FIX: Changed max value from 150 to 100
              step="1"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-green-500"
            />
          </div>
          <div>
            <label className="font-bold text-lg mb-4 block">MAP THEME</label>
            <div className="grid grid-cols-2 gap-4">
              {themes.map((theme) => {
                const Icon = theme.icon;
                const isActive = selectedTheme === theme.id;
                return (
                  <button
                    type="button"
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                      isActive
                        ? "bg-green-500/20 border-green-500"
                        : "bg-[#35354e] border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isActive ? "text-green-400" : "text-gray-400"
                      }`}
                    />
                    <span className="font-semibold">{theme.name}</span>
                    {theme.id === "cozy" && (
                      <Rocket className="w-5 h-5 ml-auto text-purple-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-between items-center mt-6">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-gray-600/50 px-5 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-gray-600/80"
          >
            <ArrowLeft className="w-4 h-4 inline-block mr-2" />
            Back
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-green-600"
          >
            <span>Confirm selection</span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
