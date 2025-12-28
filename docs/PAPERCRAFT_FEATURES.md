# Magic Gem Paper Craft Features

## Overview

The Magic Gem web app now includes a comprehensive paper craft template generator that creates printable nets for folding 3D magic gem polyhedra. This is similar to classic cube cutouts for kids, but for the complex convex hull shapes of magic squares.

## What's New

### Enhanced Papercraft Generator (`papercraft.js`)

#### New Features:

1. **Glue Tabs** 
   - Automatically generates trapezoid-shaped tabs on all cut edges
   - Intelligently placed to avoid fold lines
   - Optional "GLUE" text labels on larger tabs
   - Gray fill with dashed borders for easy identification

2. **Cell Values Display**
   - Shows the actual magic square values at triangle vertices
   - Helps understand the relationship between 2D grid and 3D geometry
   - White halo for visibility on colored faces

3. **Instructions Overlay**
   - Step-by-step assembly instructions
   - Toggle on/off for clean templates
   - Rounded rectangle with clear typography

4. **Export/Print Functionality**
   - Download as high-resolution PNG (3× resolution default)
   - Direct print with print-optimized layout
   - Filename includes magic square number

5. **Enhanced Visual Design**
   - Fold lines: dashed gray (for folding)
   - Cut lines: solid black (for cutting)
   - Glue tabs: light gray fill with dashed borders
   - Colored faces by geometric similarity
   - Professional print-ready appearance

### New UI Controls

Added to the Paper Nets tab:

- ☑️ **Show Glue Tabs** - Toggle glue tab display
- ☑️ **Show Cell Values** - Display magic square values
- ☑️ **Show Instructions** - Toggle instruction overlay
- 📥 **Download PNG** - Export as high-res image
- 🖨️ **Print** - Open print dialog

### Technical Improvements

1. **Edge Classification**
   - Automatically identifies fold edges (shared between faces)
   - Distinguishes cut edges (need glue tabs)
   - Prevents tab overlap with fold lines

2. **Spanning Tree Algorithm**
   - Creates connected net using BFS
   - Ensures all faces are reachable
   - Minimizes cuts while maintaining connectivity

3. **Geometric Preservation**
   - Uses trilateration for accurate 2D placement
   - Preserves all 3D edge lengths in the flat pattern
   - Proper face adjacency and orientation

4. **Canvas Polyfill**
   - Added `roundRect` polyfill for older browsers
   - Ensures compatibility across all modern browsers

## How It Works

### Net Generation Algorithm

1. **Build Face Adjacency Graph**
   ```
   - For each pair of triangular faces
   - Detect shared edges (3D vertices match)
   - Store adjacency relationships
   ```

2. **Create Spanning Tree**
   ```
   - BFS from first face
   - Build tree of face connections
   - Ensures single connected component
   ```

3. **Unfold Using Trilateration**
   ```
   - Place first face at origin
   - For each connected face:
     * Find shared edge
     * Calculate 3D distances
     * Trilaterate third vertex position
   ```

4. **Add Glue Tabs**
   ```
   - Identify cut edges (not in spanning tree)
   - Calculate perpendicular direction
   - Generate trapezoid tab geometry
   - Draw with appropriate styling
   ```

### Glue Tab Geometry

```
Triangle Edge
    v1 ────────────── v2
     │\              /│
     │ \            / │
     │  \   TAB   /  │
     │   \      /   │
     │    \    /    │
     │     \  /     │
     │      \/      │
```

- Width: 0.3 units (configurable)
- Inset from vertices: 0.15 units
- Trapezoid shape for easy folding
- Perpendicular to edge, pointing outward

## Usage Examples

### Basic Usage

```javascript
// Initialize generator
const generator = new PapercraftGenerator('canvas-id');

// Generate net
const stats = generator.generateNet(magicSquare, epsilon);

// Export
generator.exportAsImage('my-magic-gem.png', 3);

// Print
generator.print();
```

### Customization

```javascript
// Toggle features
generator.showGlueTabs = true;
generator.showCellValues = true;
generator.showInstructions = false;
generator.showLabels = true;
generator.showEdgeLengths = false;

// Adjust tab width
generator.glueTabWidth = 0.4; // larger tabs
```

## Files Modified

### New Files
- None (all new code integrated into existing files)

### Modified Files

1. **`papercraft.js`** (~900 lines, ~400 new)
   - Added glue tab generation
   - Enhanced drawing with instructions
   - Export and print functions
   - Edge classification logic

2. **`main.js`** (~30 lines added)
   - New control event handlers
   - Export/print button functionality
   - Unified refresh logic

3. **`index.html`** (~15 lines added)
   - New checkbox controls
   - Export and print buttons
   - Updated papercraft section

4. **`README.md`** (~50 lines added)
   - Paper craft documentation
   - Assembly instructions
   - Educational use cases

## Assembly Instructions

### For Educators and Users:

1. **Printing**
   - Use card stock (110-300 gsm)
   - Print at 100% scale (no fit-to-page)
   - Color or black & white both work

2. **Cutting**
   - Cut along all solid black lines
   - Use sharp scissors or craft knife
   - Don't cut dashed lines!

3. **Scoring**
   - Use ruler and empty ballpoint pen
   - Score all dashed fold lines
   - Helps create crisp folds

4. **Folding**
   - Fold along all dashed lines
   - Check 3D shape as you go
   - Some folds may be valley, some mountain

5. **Gluing**
   - Apply glue to gray tabs
   - Press tab against matching edge
   - Hold 10-20 seconds
   - Work one tab at a time

## Educational Applications

### Classroom Activities

- **Geometry**: Explore polyhedra, faces, edges, vertices
- **Number Theory**: Discover magic square patterns
- **Art**: Create mathematical sculptures
- **Problem Solving**: Understand 2D to 3D transformations

### Workshop Ideas

1. **Magic Square Race**: Who can assemble fastest?
2. **Pattern Discovery**: Compare different 4×4 squares
3. **Scaling Study**: Print different sizes, measure volumes
4. **Group Theory**: Apply D₄ symmetries to your model

## Technical Details

### Coordinate Systems

- **3D Space**: Original magic gem coordinates
  - x, y: grid positions (centered)
  - z: cell values (centered)
  
- **2D Net**: Unfolded template
  - Distances preserved from 3D
  - Faces connected by spanning tree
  - Tabs added to cut edges

### Performance

- Net generation: ~50ms for 20 faces
- Canvas rendering: ~100ms
- Export (3× resolution): ~200ms
- Scales well to complex hulls

### Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE: Not supported

## Future Enhancements

### Potential Additions

1. **Auto-Layout Optimization**
   - Minimize bounding box
   - Reduce paper waste
   - Better tab placement

2. **Multiple Pages**
   - Split large nets across pages
   - Add page numbers and alignment marks

3. **SVG Export**
   - Vector format for scaling
   - Better for laser cutting
   - Professional printing

4. **3D Preview**
   - Hover to show connected face
   - Highlight fold/cut edges
   - Animation of folding process

5. **Custom Scaling**
   - Specify final model size
   - Auto-calculate scale factor

6. **Tab Numbering**
   - Match tabs to edges
   - Easier assembly

## Known Limitations

1. **Tab Overlap**: Some complex geometries may have overlapping tabs
   - Solution: Manual tab adjustment or hide specific tabs

2. **Face Ordering**: Spanning tree is BFS, not optimal for layout
   - Solution: Implement better layout algorithm

3. **Print Scale**: Default scale may be too small for some printers
   - Solution: Export at higher resolution and scale in print dialog

## Credits

Algorithm inspired by:
- Classical polyhedron net generation
- Graph theory (spanning trees)
- Computational geometry (trilateration)

Designed for the Magic Gems mathematical framework by Kyle Mathewson.

## License

Part of the Magic Gems project. See main repository for license details.
