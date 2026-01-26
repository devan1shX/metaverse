"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2, Lock, Unlock } from "lucide-react";

interface LayerPanelProps {
  layers: { id: number; name: string; visible: boolean; opacity: number }[];
  currentLayerIndex: number;
  onLayerSelect: (index: number) => void;
  onLayerToggle: (index: number) => void;
  onLayerClear: (index: number) => void;
  onLayerOpacityChange: (index: number, opacity: number) => void;
}

export default function LayerPanel({
  layers,
  currentLayerIndex,
  onLayerSelect,
  onLayerToggle,
  onLayerClear,
  onLayerOpacityChange,
}: LayerPanelProps) {
  const [collisionExpanded, setCollisionExpanded] = useState(false);
  
  // Manage expanded state for each layer's details
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());

  const toggleDetails = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDetails(newExpanded);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Map Layers</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {layers.slice().reverse().map((layer, reverseIndex) => {
          // Calculate actual index since we're mapping reversed array for display order (Top layer first)
          const index = layers.length - 1 - reverseIndex;
          const isActive = currentLayerIndex === index;
          const isDetailsOpen = expandedDetails.has(index);
          
          return (
            <div
              key={layer.id}
              className={`rounded border transition-all duration-200 group ${
                isActive 
                  ? 'bg-slate-50 border-indigo-500/50 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              {/* Layer Row */}
              <div 
                className="flex items-center p-2 cursor-pointer"
                onClick={() => onLayerSelect(index)}
              >
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggle(index);
                  }}
                  className={`p-1 rounded hover:bg-slate-200 mr-2 transition-colors ${layer.visible ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  title={layer.visible ? "Hide Layer" : "Show Layer"}
                >
                  {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Layer Name */}
                <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {layer.name}
                </span>

                {/* Ops Wrapper */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                   {/* Settings Toggle */}
                   <button
                    onClick={(e) => toggleDetails(index, e)}
                    className={`p-1 rounded hover:bg-slate-200 transition-colors ${isDetailsOpen ? 'bg-slate-200 text-slate-800' : 'text-slate-400'}`}
                  >
                    {isDetailsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              
              {/* Layer Details (Expanded) */}
              {isDetailsOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-200 bg-slate-50/50">
                  {/* Opacity Slider */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                      <span>Opacity</span>
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.opacity * 100}
                      onChange={(e) => onLayerOpacityChange(index, parseInt(e.target.value) / 100)}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Clear all tiles from ${layer.name} layer?`)) {
                          onLayerClear(index);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Content
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Info Section */}
        <div className="mt-6 px-2">
           <button
            onClick={() => setCollisionExpanded(!collisionExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider mb-2"
          >
            {collisionExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Collision Info
          </button>
          
          {collisionExpanded && (
             <div className="bg-slate-50 rounded p-3 text-xs border border-slate-200 space-y-2">
                <div className="flex items-start gap-2">
                   <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${currentLayerIndex === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                   <div>
                     <span className="text-slate-700 font-medium block mb-0.5">{layers[currentLayerIndex].name}</span>
                     <span className="text-slate-500">
                        {currentLayerIndex === 0 ? "Walkable (No Collision)" : "Obstacle (Blocks Movement)"}
                     </span>
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
