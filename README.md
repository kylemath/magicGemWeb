# Magic Gems Web Application

An interactive web application for exploring Magic Squares and their 3D geometric representations (Magic Gems).

## Quick Start

```bash
cd web
python3 server.py
```

Then open http://localhost:8880 in your browser.

## Features

### 1. Introduction Tab
- What are magic squares and the Magic Gem framework
- The Zero-Covariance Theorem
- Historical context (Lo Shu square)

### 2. 3D Visualization Tab
- Interactive Three.js rendering of Magic Gems
- Toggle vertices, edges, faces, and vectors
- Support for n=3, 4, 5 magic squares
- Auto-rotation option

### 3. Energy Landscape Tab
- Energy distribution histograms
- Perturbation analysis plots
- Scaling properties visualization
- Interactive energy explorer (swap cells and watch energy change)

### 4. New Theorems Tab
- Exact variance formulas: Var(Z) = (n⁴-1)/12
- Extended moment vanishing: E[X²Z] = E[Y²Z] = 0
- Constant 12 hull vertices for n≥5
- Modular preservation theorem

### 5. Connections Tab
- Links to representation theory, statistical mechanics, number theory
- Algebraic geometry and tensegrity connections
- Potential Langlands connections (speculative)

### 6. Explore Tab
- Generate magic squares with different methods
- Click cells to swap values
- Real-time property updates
- Mini 3D viewer

### 7. 4×4 Gallery Tab
- Browse all unique 4×4 magic squares
- Interactive 3D visualization for each square
- Face coloring by geometric similarity
- Explore the diversity of magic gem shapes

### 8. Paper Nets Tab 📄 (NEW!)
- Unfold any magic gem into a flat paper craft template
- **Glue tabs** automatically added to cut edges
- **Fold lines** shown as dashed lines
- **Cut lines** shown as solid black lines
- **Cell values** displayed on vertices (optional)
- **Face coloring** by geometric similarity
- **Print-ready** templates with instructions
- **Export** as high-resolution PNG
- Perfect for creating physical 3D models!

## Key Mathematical Insight

**Setting all covariances to zero is equivalent to solving a system of LINEAR equations:**

1. Cov(X,Z) = 0 → Column symmetry (C₀ = C₂ for n=3)
2. Cov(Y,Z) = 0 → Row symmetry (R₀ = R₂ for n=3)
3. Cov(D_main,Z) = 0 → Main diagonal = M(n)
4. Cov(D_anti,Z) = 0 → Anti-diagonal = M(n)

For n=3:
- 760 arrangements satisfy conditions 1 & 2
- Only 8 satisfy all four (these are the magic squares!)

This provides a **declarative** view of magic squares as solutions to a constraint system, rather than the **algorithmic** view of construction methods.

## Files

```
web/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Modern dark theme styles
├── js/
│   ├── magicSquares.js # Core mathematical functions
│   ├── magicGem3D.js   # Three.js visualization
│   ├── plots.js        # Plotly visualizations
│   ├── papercraft.js   # Paper net generator (NEW!)
│   └── main.js         # Application logic
├── server.py           # Python backend server
└── README.md           # This file
```

## Dependencies

- **Frontend**: Three.js, Plotly.js, MathJax (loaded via CDN)
- **Backend**: Python 3 with NumPy

## Paper Craft Templates

The Paper Nets tab allows you to create physical 3D models of magic gems:

### Creating Your Own Magic Gem:

1. **Navigate** to the "Paper Nets" tab
2. **Select** any 4×4 magic square from the gallery
3. **Customize** display options:
   - Toggle glue tabs (recommended for assembly)
   - Show/hide cell values
   - Color similar faces for easier assembly
   - Show/hide instructions overlay
4. **Export** as PNG or print directly
5. **Assemble**:
   - Print on card stock (110lb or heavier recommended)
   - Cut along solid black lines
   - Fold along dashed lines
   - Apply glue to gray tabs
   - Press tabs against matching edges

### Tips:

- **Card stock**: Use thicker paper (110-300 gsm) for sturdier models
- **Scoring**: Score fold lines with a ruler and empty pen before folding
- **Glue**: White glue or glue stick works well
- **Patience**: Let glue dry between steps for best results
- **Scale**: Export at 3× resolution for larger prints

### Educational Use:

These templates are perfect for:
- Teaching geometric concepts
- Exploring magic square properties physically
- STEM education and workshops
- Mathematical art projects

## Limitations

The "12 hull vertices" finding for n≥5 is likely specific to Siamese-constructed squares. Different construction methods may yield different geometric properties. See the main analysis for details.
