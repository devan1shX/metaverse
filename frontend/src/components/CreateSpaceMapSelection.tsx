"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, Map } from "lucide-react";
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";
import { useToast } from "@/contexts/ToastContext";

interface CreateSpaceMapSelectionProps {
  selectedUseCase: string; 
  onSelect: (map: string, thumbnailUrl?: string) => void;
}

interface CustomMap {
  mapId: string;
  name: string;
  createdAt: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
}

const defaultMaps = [
  {
    id: "office-01",
    title: "Office Map 1",
    description: "A modern office space perfect for daily collaboration.",
    image: "/images/space-1.png",
    useCase: "remote-office",
  },
  {
    id: 'office-02',
    title: 'Office Map 2',
    description: 'A large office for hosting events, talks, and presentations.',
    image: '/images/space-2.png',
    useCase: "conference",
  },
  {
    id: "dynamic-office",
    title: "Generate Custom Office",
    description: "Tell us your team size and we will perfectly scale the office specifically for you.",
    image: "/images/space-3.png", 
    useCase: "remote-office",
  }
];

export default function CreateSpaceMapSelection({
  selectedUseCase,
  onSelect,
}: CreateSpaceMapSelectionProps) {
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchCustomMaps();
    // Pre-select default map based on use case
    const defaultMap = defaultMaps.find(map => map.useCase === selectedUseCase);
    if (defaultMap) {
      setSelectedMapId(defaultMap.id);
    }
  }, [selectedUseCase]);

  const fetchCustomMaps = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3000/metaverse/custom-maps/my-maps', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setCustomMaps(result.maps || []);
      }
    } catch (error) {
      console.error('Error fetching custom maps:', error);
      showToast('Error fetching custom maps', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-8">
        <p className="surface-label mb-3">Map Selection</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-2">Choose a Map</h1>
        <p className="text-[var(--text-muted)]">Select a default map or use your custom map.</p>
      </div>

      {/* Default Maps Section */}
      <div className="mb-8">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Default Maps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {defaultMaps.map((map) => (
            <div 
              key={map.id}
              className={`card card-hover cursor-pointer p-4 ${
                selectedMapId === map.id
                  ? "border-[rgba(239,188,130,0.28)] bg-[rgba(215,163,102,0.08)]"
                  : ""
              }`}
              onClick={() => setSelectedMapId(map.id)}
            >
              <div className="aspect-video w-full rounded-lg overflow-hidden mb-3 relative">
                <Image
                  src={map.image}
                  alt={map.title}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <h3 className="mb-1 font-display text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{map.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{map.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Maps Section */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent"></div>
          <p className="mt-2 text-[var(--text-muted)]">Loading custom maps...</p>
        </div>
      ) : customMaps.length > 0 ? (
        <div className="mb-8">
          <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Your Custom Maps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customMaps.map((map) => (
              <div 
                key={map.mapId}
                className={`card card-hover cursor-pointer p-4 ${
                  selectedMapId === map.mapId
                    ? "border-[rgba(239,188,130,0.28)] bg-[rgba(215,163,102,0.08)]"
                    : ""
                }`}
                onClick={() => setSelectedMapId(map.mapId)}
              >
                <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg border border-white/8 bg-[rgba(255,255,255,0.03)] flex items-center justify-center">
                  {map.thumbnailUrl ? (
                    <Image
                        src={map.thumbnailUrl}
                        alt={map.name}
                        fill
                        style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Map className="h-14 w-14 text-[var(--accent)]" />
                  )}
                </div>
                <h3 className="mb-1 font-display text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{map.name}</h3>
                <p className="text-sm text-[var(--text-muted)]">{map.width}x{map.height} tiles</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">Created: {new Date(map.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] py-8 text-center">
          <Map className="mx-auto mb-3 h-12 w-12 text-[var(--text-soft)]" />
          <p className="font-medium text-[var(--text-secondary)]">No custom maps yet</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">Create maps in the Map Editor to see them here.</p>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => {
            if (selectedMapId) {
              const selectedCustomMap = customMaps.find(m => m.mapId === selectedMapId);
              const selectedDefaultMap = defaultMaps.find(m => m.id === selectedMapId);
              const thumbUrl = selectedCustomMap?.thumbnailUrl || selectedDefaultMap?.image;
              onSelect(selectedMapId, thumbUrl);
            } else {
              showToast('Please select a map first', 'error');
            }
          }}
          disabled={!selectedMapId}
          className="btn-success text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Create Space with Selected Map</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
