"use client";

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
  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Layers</h3>
      
      <div className="space-y-2">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`
              p-3 rounded transition-colors
              ${currentLayerIndex === index 
                ? 'bg-blue-600 border-2 border-blue-400' 
                : 'bg-gray-700'}
            `}
          >
            <div 
              onClick={() => onLayerSelect(index)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={(e) => {
                      e.stopPropagation();
                      onLayerToggle(index);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="font-semibold">{layer.name}</span>
                </div>
                {currentLayerIndex === index && (
                  <span className="text-xs bg-green-500 px-2 py-1 rounded">
                    Active
                  </span>
                )}
              </div>
            </div>
            
            {/* Opacity Slider */}
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.opacity * 100}
                  onChange={(e) => {
                    e.stopPropagation();
                    onLayerOpacityChange(index, parseInt(e.target.value) / 100);
                  }}
                  className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-400 w-10">{Math.round(layer.opacity * 100)}%</span>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Clear all tiles from ${layer.name} layer?`)) {
                  onLayerClear(index);
                }
              }}
              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded transition-colors"
            >
              🗑️ Clear Layer
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-800 rounded text-sm text-gray-300">
        <div className="font-semibold mb-1">Render Order:</div>
        <div className="text-xs">
          ↑ Above Objects (Top)<br/>
          ↑ Objects<br/>
          ↑ Walls<br/>
          ↑ Ground (Bottom)
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-900 rounded text-sm">
        <div className="font-semibold mb-2">💡 Layer Guide:</div>
        <div className="text-xs text-blue-200 space-y-1">
          <div><strong>Ground:</strong> Floors, carpets</div>
          <div><strong>Walls:</strong> Wall tiles, doors</div>
          <div><strong>Objects:</strong> Desks, chairs</div>
          <div><strong>Above:</strong> Items on furniture</div>
        </div>
      </div>
    </div>
  );
}
