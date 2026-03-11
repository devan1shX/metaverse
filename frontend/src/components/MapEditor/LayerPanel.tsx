"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2 } from "lucide-react";

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
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[rgba(14,19,27,0.88)] px-4 py-4 backdrop-blur-xl">
        <h3 className="surface-label">Map Layers</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Stack depth without blocking the map.</p>
      </div>
      
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {layers.slice().reverse().map((layer, reverseIndex) => {
          // Calculate actual index since we're mapping reversed array for display order (Top layer first)
          const index = layers.length - 1 - reverseIndex;
          const isActive = currentLayerIndex === index;
          const isDetailsOpen = expandedDetails.has(index);
          
          return (
            <div
              key={layer.id}
              className={`group rounded-[22px] border transition-all duration-200 ${
                isActive 
                  ? "border-[rgba(239,188,130,0.24)] bg-[rgba(215,163,102,0.12)] shadow-[0_16px_34px_rgba(2,6,12,0.22)]"
                  : "border-[var(--border-default)] bg-white/[0.03] hover:border-[var(--border-strong)] hover:bg-white/[0.05]"
              }`}
            >
              {/* Layer Row */}
              <div 
                className="flex cursor-pointer items-center gap-2 p-3"
                onClick={() => onLayerSelect(index)}
              >
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggle(index);
                  }}
                  className={`mr-1 rounded-full border p-2 transition-colors ${layer.visible ? "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]" : "border-transparent text-[var(--text-soft)] hover:bg-white/5 hover:text-[var(--text-secondary)]"}`}
                  title={layer.visible ? "Hide Layer" : "Show Layer"}
                >
                  {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Layer Name */}
                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                    {layer.name}
                  </span>
                  <span className="mt-1 block text-[11px] text-[var(--text-soft)]">
                    {Math.round(layer.opacity * 100)}% opacity
                  </span>
                </div>

                {/* Ops Wrapper */}
                <div className="ml-2 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                   {/* Settings Toggle */}
                   <button
                    onClick={(e) => toggleDetails(index, e)}
                    className={`rounded-full border p-2 transition-colors ${isDetailsOpen ? "border-[rgba(239,188,130,0.22)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]" : "border-transparent text-[var(--text-soft)] hover:border-[var(--border-default)] hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                  >
                    {isDetailsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              
              {/* Layer Details (Expanded) */}
              {isDetailsOpen && (
                <div className="border-t border-[var(--border-default)] bg-black/10 px-4 pb-4 pt-3">
                  {/* Opacity Slider */}
                  <div className="mb-3">
                    <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      <span>Opacity</span>
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.opacity * 100}
                      onChange={(e) => onLayerOpacityChange(index, parseInt(e.target.value) / 100)}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[var(--accent)]"
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
                      className="flex items-center gap-1.5 rounded-full border border-[rgba(239,124,120,0.2)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Content
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        </div>
    </div>
  );
}
