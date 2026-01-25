"use client";

interface LayerPanelProps {
  layers: { id: number; name: string; visible: boolean }[];
  currentLayerIndex: number;
  onLayerSelect: (index: number) => void;
  onLayerToggle: (index: number) => void;
}

export default function LayerPanel({
  layers,
  currentLayerIndex,
  onLayerSelect,
  onLayerToggle,
}: LayerPanelProps) {
  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Layers</h3>
      
      <div className="space-y-2">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => onLayerSelect(index)}
            className={`
              p-3 rounded cursor-pointer transition-colors
              ${currentLayerIndex === index 
                ? 'bg-blue-600 border-2 border-blue-400' 
                : 'bg-gray-700 hover:bg-gray-600'}
            `}
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
