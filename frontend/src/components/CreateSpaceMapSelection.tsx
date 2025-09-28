"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CreateSpaceMapSelectionProps {
  selectedUseCase: string; 
  onSelect: (map: string) => void;
}

const maps = [
  {
    id: "corporate-hq",
    title: "Corporate HQ",
    description: "A modern office space perfect for daily collaboration.",
    image: "/images/space-1.png",
    useCase: "remote-office",
  },
  {
    id: 'conference-hall',
    title: 'Conference Hall',
    description: 'A large hall for hosting events, talks, and presentations.',
    image: '/images/space-2.png',
    useCase: "conference",
  },
];

export default function CreateSpaceMapSelection({
  selectedUseCase,
  onSelect,
}: CreateSpaceMapSelectionProps) {
  const selectedMap = maps.find(map => map.useCase === selectedUseCase);

  if (!selectedMap) {
    return (
      <div className="text-center text-red-500">
        <h2>Error: Map not found for this selection.</h2>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Choose a Space</h1>
        <p className="text-gray-400">Select a map template for your new space.</p>
      </div>

      <div className="bg-[#35354e] border border-gray-700/50 rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div className="aspect-video w-full rounded-lg overflow-hidden mb-6 relative">
          <Image
            src={selectedMap.image}
            alt={selectedMap.title}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{selectedMap.title}</h3>
            <p className="text-gray-400 text-sm">{selectedMap.description}</p>
          </div>
          <button
            onClick={() => onSelect(selectedMap.id)}
            className="mt-4 sm:mt-0 flex items-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-green-600"
          >
            <span>Create with this map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}