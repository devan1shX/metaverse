"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, Map } from "lucide-react";
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";

interface CreateSpaceMapSelectionProps {
  selectedUseCase: string; 
  onSelect: (map: string) => void;
}

interface CustomMap {
  mapId: string;
  name: string;
  createdAt: string;
  width: number;
  height: number;
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
];

export default function CreateSpaceMapSelection({
  selectedUseCase,
  onSelect,
}: CreateSpaceMapSelectionProps) {
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapId, setSelectedMapId] = useState<string>('');

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Choose a Map</h1>
        <p className="text-gray-600">Select a default map or use your custom map.</p>
      </div>

      {/* Default Maps Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Default Maps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {defaultMaps.map((map) => (
            <div 
              key={map.id}
              className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${
                selectedMapId === map.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
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
              <h3 className="font-bold text-gray-900 mb-1">{map.title}</h3>
              <p className="text-gray-600 text-sm">{map.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Maps Section */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-2">Loading custom maps...</p>
        </div>
      ) : customMaps.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Custom Maps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customMaps.map((map) => (
              <div 
                key={map.mapId}
                className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedMapId === map.mapId ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedMapId(map.mapId)}
              >
                <div className="aspect-video w-full rounded-lg overflow-hidden mb-3 relative bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                  <Map className="w-16 h-16 text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{map.mapId}</h3>
                <p className="text-gray-600 text-sm">{map.width}x{map.height} tiles</p>
                <p className="text-gray-500 text-xs mt-1">Created: {new Date(map.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Map className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No custom maps yet</p>
          <p className="text-gray-500 text-sm mt-1">Create maps in the Map Editor to see them here!</p>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => {
            if (selectedMapId) {
              onSelect(selectedMapId);
            } else {
              alert('Please select a map first');
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