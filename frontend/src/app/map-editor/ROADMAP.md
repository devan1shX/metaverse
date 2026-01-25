# Map Editor - Complete Future Roadmap & Implementation Guide

## 📍 **CURRENT STATUS: Phase 2 Complete** ✅

**What Works Now:**
- ✅ Canvas with 20×15 grid
- ✅ Three tilesets (Floors, Walls, Objects)
- ✅ Click and drag-to-paint
- ✅ Multi-tile stamp selection
- ✅ Instant test with avatar movement
- ✅ Export to Tiled JSON

**What's Next:** Multi-layer support, advanced tools, undo/redo

---

## 🗺️ COMPLETE IMPLEMENTATION ROADMAP

### **Phase 1: Basic Editor** ✅ COMPLETED (Day 1)
- ✅ Canvas with grid
- ✅ Single tileset loading
- ✅ Click to paint tiles
- ✅ Export to JSON

### **Phase 2: Export & Testing** ✅ COMPLETED (Day 2)
- ✅ Multi-tileset support  
- ✅ Multi-tile stamps
- ✅ Drag-to-paint
- ✅ Instant test mode

### **Phase 3: Multi-Layer Support** 🎯 **START HERE**
**Estimated Time:** 2-3 days

**Goal:** Independent layers for Ground, Objects, and Walls

**What You'll Build:**
1. Three separate paint layers
2. Layer selection UI
3. Layer visibility toggle
4. Correct rendering order
5. Layer-specific painting

**Why This Matters:**
- Organize floor vs furniture vs walls
- Easier collision management
- Professional workflow
- Industry standard

---

### **Phase 4: Advanced Tools** 🔜 (Week 2)
**Estimated Time:** 3-4 days

**Goal:** Professional editing tools

**Features:**
1. Eraser tool (delete tiles)
2. Fill bucket (flood fill)
3. Eyedropper (pick from canvas)  
4. Selection rectangle
5. Copy/paste tiles
6. Clear layer button

**Why This Matters:**
- Fix mistakes easily
- Faster workflows
- Professional feel

---

### **Phase 5: Undo/Redo** 🔜 (Week 2)
**Estimated Time:** 2-3 days

**Goal:** Never lose work

**Features:**
1. History stack (50 states)
2. Undo (Ctrl+Z)
3. Redo (Ctrl+Y)
4. Visual history indicator
5. Memory management

**Why This Matters:**
- Experiment freely
- Instant mistake fixes
- User confidence

---

### **Phase 6: Import & Templates** 🔜 (Week 3)
**Estimated Time:** 2-3 days

**Goal:** Load and edit existing maps

**Features:**
1. Load existing maps
2. Import from JSON
3. Template library
4. Save to localStorage
5. Auto-save

**Why This Matters:**
- Edit existing maps
- Quick start templates
- No data loss

---

### **Phase 7: Polish & UX** 🔜 (Week 3-4)
**Estimated Time:** 3-5 days

**Goal:** Professional interface

**Features:**
1. Keyboard shortcuts
2. Canvas zoom & pan
3. Mini-map preview
4. Better UI/colors
5. Tooltips & help
6. Responsive design

---

## 🚀 PHASE 3: MULTI-LAYER IMPLEMENTATION (DETAILED GUIDE)

### **📋 Overview**

**What:** Build 3 independent paint layers
**Why:** Separate floors, objects, and walls
**How Long:** 2-3 days
**Difficulty:** Intermediate

---

### **STEP 3.1: Update Data Structure** (5 minutes)

**File:** `src/types/MapEditor.types.ts`

**What to do:**
The types are already correct! No changes needed.

**Verify:**
```typescript
interface Layer {
  id: number;
  name: string;
  type: "tilelayer";
  visible: boolean;
  opacity: number;
  data: (TileData | null)[];
  width: number;
  height: number;
}
```

✅ Already supports multiple layers!

---

### **STEP 3.2: Initialize 3 Layers** (10 minutes)

**File:** `src/components/MapEditor/MapEditor.tsx`

**Find:** Line ~60, the `mapData` initialization

**Replace:**
```typescript
// CURRENT (1 layer):
layers: [
  {
    id: 0,
    name: "Ground",
    type: "tilelayer",
    visible: true,
    opacity: 1,
    data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  },
],

// NEW (3 layers):
layers: [
  {
    id: 0,
    name: "Ground",
    type: "tilelayer",
    visible: true,
    opacity: 1,
    data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  },
  {
    id: 1,
    name: "Objects",
    type: "tilelayer",
    visible: true,
    opacity: 1,
    data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  },
  {
    id: 2,
    name: "Walls",
    type: "tilelayer",
    visible: true,
    opacity: 1,
    data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  },
],
```

**Add state** for current layer (after other useState calls):
```typescript
const [currentLayerIndex, setCurrentLayerIndex] = useState<number>(0);
```

**Test:** Refresh browser, check console → should show 3 layers

---

### **STEP 3.3: Update Canvas Rendering** (15 minutes)

**File:** `src/components/MapEditor/Canvas.tsx`

**Find:** The rendering loop (around line 80)

**Replace:**
```typescript
// CURRENT (renders only layer 0):
const layer = mapData.layers[0];
if (layer && layer.visible) {
  // render tiles...
}

// NEW (renders ALL visible layers):
mapData.layers.forEach((layer) => {
  if (layer && layer.visible) {
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const index = y * mapData.width + x;
        const tileData = layer.data[index];

        if (tileData && tileData.tileId > 0) {
          const tileset = tilesets[tileData.tilesetIndex];
          const img = tilesetImages.get(tileset.id);

          if (img && tileset) {
            const tileIndex = tileData.tileId - 1;
            const sourceX = (tileIndex % tileset.columns) * tileset.tileWidth;
            const sourceY = Math.floor(tileIndex / tileset.columns) * tileset.tileHeight;

            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              tileset.tileWidth,
              tileset.tileHeight,
              x * mapData.tilewidth,
              y * mapData.tileheight,
              mapData.tilewidth,
              mapData.tileheight
            );
          }
        }
      }
    }
  }
});
```

**Why:** Layers render in order: Ground → Objects → Walls (bottom to top)

**Test:** Paint tiles → should still work (on layer 0)

---

### **STEP 3.4: Update Paint Logic** (10 minutes)

**File:** `src/components/MapEditor/MapEditor.tsx`

**Find:** `handleCanvasClick` function

**Replace painting logic:**
```typescript
// CURRENT (always paints layer 0):
const newData = [...mapData.layers[0].data];
// ... paint code ...
setMapData({
  ...mapData,
  layers: [{
    ...mapData.layers[0],
    data: newData,
  }],
});

// NEW (paints current layer):
const newData = [...mapData.layers[currentLayerIndex].data];

// ... paint code (single tile or stamp) ...

// Update the specific layer:
const updatedLayers = [...mapData.layers];
updatedLayers[currentLayerIndex] = {
  ...updatedLayers[currentLayerIndex],
  data: newData,
};

setMapData({
  ...mapData,
  layers: updatedLayers,
});
```

**Test:** Painting should still work

---

### **STEP 3.5: Create Layer Panel** (20 minutes)

**Create new file:** `src/components/MapEditor/LayerPanel.tsx`

**Copy this code:**

```typescript
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
          ↑ Walls (Top)<br/>
          ↑ Objects<br/>
          ↑ Ground (Bottom)
        </div>
      </div>
    </div>
  );
}
```

**Save file**

---

### **STEP 3.6: Integrate Layer Panel** (15 minutes)

**File:** `src/components/MapEditor/MapEditor.tsx`

**1. Import LayerPanel:**
```typescript
import LayerPanel from "@/components/MapEditor/LayerPanel";
```

**2. Add handler functions** (after other handlers):
```typescript
const handleLayerSelect = (index: number) => {
  setCurrentLayerIndex(index);
};

const handleLayerToggle = (index: number) => {
  const updatedLayers = [...mapData.layers];
  updatedLayers[index] = {
    ...updatedLayers[index],
    visible: !updatedLayers[index].visible,
  };
  
  setMapData({
    ...mapData,
    layers: updatedLayers,
  });
};
```

**3. Replace right sidebar:**

Find the section that says `{/* Right Sidebar - Info */}` and replace it with:

```tsx
{/* Right Sidebar - Layers */}
<div className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto">
  <LayerPanel
    layers={mapData.layers}
    currentLayerIndex={currentLayerIndex}
    onLayerSelect={handleLayerSelect}
    onLayerToggle={handleLayerToggle}
  />
</div>
```

**Save file**

---

### **STEP 3.7: Test Everything** (30 minutes)

**Test Checklist:**

**1. Paint on Ground Layer:**
- [ ] Ground layer is active (blue background)
- [ ] Select floor tiles
- [ ] Paint a 10×10 area
- [ ] Tiles appear

**2. Paint on Objects Layer:**
- [ ] Click "Objects" in layer panel
- [ ] Objects layer turns blue
- [ ] Select desk/chair tiles
- [ ] Paint furniture
- [ ] Objects appear ON TOP of floor

**3. Paint on Walls Layer:**
- [ ] Click "Walls" in layer panel
- [ ] Walls layer turns blue
- [ ] Select wall tiles
- [ ] Paint border walls
- [ ] Walls appear on very top

**4. Toggle Visibility:**
- [ ] Uncheck "Objects" → furniture disappears
- [ ] Uncheck "Walls" → walls disappear
- [ ] Check them back → they reappear

**5. Export & Test:**
- [ ] Click "🎮 Test Map"
- [ ] All three layers visible in game
- [ ] Avatar walks on floor
- [ ] Objects and walls render correctly

**Success = All checkboxes ✅**

---

## 🎓 COMPLETE IMPLEMENTATION WORKFLOW

### **Day 1 (Phase 3):**
**Morning (2 hours):**
- Step 3.1: Verify types ✓
- Step 3.2: Initialize 3 layers
- Step 3.3: Update canvas rendering
- Coffee break ☕

**Afternoon (2 hours):**
- Step 3.4: Update paint logic
- Step 3.5: Create LayerPanel
- Step 3.6: Integrate LayerPanel
- Test basic functionality

### **Day 2 (Phase 3 continued):**
**Morning (2 hours):**
- Thorough testing
- Fix any bugs
- Export and test in game
- Verify all layers work

**Afternoon (optional):**
- Polish UI
- Add keyboard shortcuts (optional)
- Documentation

---

## ✅ SUCCESS METRICS

### **Phase 3 Complete When:**
- ✅ 3 layers exist and are independent
- ✅ Can switch between layers
- ✅ Can toggle layer visibility
- ✅ Layers render in correct order (Ground → Objects → Walls)
- ✅ Painting affects only active layer
- ✅ Export includes all 3 layers
- ✅ Test mode shows all layers
- ✅ No bugs or visual glitches

### **Phase 4 Complete When:**
- ✅ Eraser tool removes tiles
- ✅ Fill bucket floods connected areas
- ✅ Eyedropper picks tiles from canvas
- ✅ All tools work across all layers
- ✅ Tool switching is smooth

### **Phase 5 Complete When:**
- ✅ Undo (Ctrl+Z) works for all actions
- ✅ Redo (Ctrl+Y) works
- ✅ History shows 50 states
- ✅ Memory doesn't leak
- ✅ Works across all tools and layers

---

## 📚 RESOURCES FOR EACH PHASE

### **Phase 3 Resources:**
- [React State Management](https://react.dev/learn/managing-state)
- [Array Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

### **Phase 4 Resources:**
- [Flood Fill Algorithm](https://en.wikipedia.org/wiki/Flood_fill)
- [Eyedropper Pattern](https://www.w3schools.com/colors/colors_picker.asp)
- [Canvas Drawing](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes)

### **Phase 5 Resources:**
- [Command Pattern (Undo/Redo)](https://refactoring.guru/design-patterns/command)
- [Immutability in JavaScript](https://wecodetheweb.com/2016/02/12/immutable-javascript-using-es6-and-beyond/)
- [Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)

---

## 💡 PRO TIPS

### **Tip 1: Test After Every Step**
Don't code for hours without testing. After each step, refresh and verify.

### **Tip 2: Console Log Everything**
```typescript
console.log('Current layer:', currentLayerIndex);
console.log('Layer name:', mapData.layers[currentLayerIndex].name);
console.log('Painting at:', tileX, tileY);
```

### **Tip 3: Start Simple**
- Phase 3: Get 2 layers working first, then add 3rd
- Phase 4: Start with eraser, then add fill
- Phase 5: Basic undo first, then redo

### **Tip 4: Keep Old Code Commented**
```typescript
// OLD:
// const newData = [...mapData.layers[0].data];

// NEW (multi-layer):
const newData = [...mapData.layers[currentLayerIndex].data];
```

### **Tip 5: Export Test Maps**
After each phase, export a test map and keep it as backup.

---

## 🚦 WHEN TO MOVE TO NEXT PHASE

### **Ready for Phase 3 → Phase 4:**
- ✅ Can switch layers smoothly
- ✅ All 3 layers work independently
- ✅ Export includes all layers
- ✅ Understand current system
- ✅ Feel confident

### **Ready for Phase 4 → Phase 5:**
- ✅ All 3 tools work (brush, eraser, fill)
- ✅ Tools work on all layers
- ✅ No major bugs
- ✅ Want undo/redo safety

### **Ready for Phase 5 → Phase 6:**
- ✅ Undo/redo works perfectly
- ✅ History doesn't leak memory
- ✅ Works across all tools
- ✅ Ready for importing

---

## 🎯 YOUR NEXT ACTION

**Tomorrow Morning:**
1. Read Steps 3.1 through 3.7 above
2. Open MapEditor.tsx in VS Code
3. Start with Step 3.2 (Initialize 3 layers)
4. Work through each step sequentially
5. Test after each step
6. Complete in 2-3 hours

**Success = Layer panel showing Ground/Objects/Walls with switching and visibility toggle working!**

---

**Created:** 2026-01-25  
**Version:** 3.0 - Complete Roadmap  
**Next Milestone:** Multi-Layer Support 🎯










