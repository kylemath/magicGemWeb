# Magic Square Geometric Embedding

This repository contains OpenSCAD scripts for visualizing magic squares using the R³ embedding approach described in the paper "Complete Analysis Pipeline for Magic Squares".

## Files

- `magicGem.scad`: The main script that converts magic squares into 3D geometric representations
- `test.scad`: Original script for basic visualization of magic squares as height maps

## Magic Square Geometric Embedding

The `magicGem.scad` script implements the R³ embedding approach described in the paper. This approach maps each entry `M_{ij}` in a magic square to a point `p_{ij} = (i, j, M_{ij})` in 3D space, creating a point cloud that preserves both the positional relationships between entries and their numerical values.

The script classifies each point in the embedding as one of three types:
- **Vertices** (red): Points that form the vertices of the convex hull
- **Face Points** (blue): Points that lie on the faces of the convex hull but are not vertices
- **Interior Points** (green): Points that lie inside the convex hull

## Usage

1. Open `magicGem.scad` in OpenSCAD
2. Adjust the parameters at the top of the file to customize the visualization:
   - `point_size`: Size of points in the embedding
   - `edge_size`: Thickness of edges in the convex hull
   - `hull_opacity`: Opacity of the convex hull faces
   - `grid_spacing`: Space between displayed magic squares
   - `show_grid`: Whether to show the underlying grid
   - `show_points`: Whether to show the embedded points
   - `show_hull`: Whether to show the convex hull
   - `show_classification`: Whether to color points by classification
   - `show_hull_faces`: Whether to show the faces of the convex hull
   - `selected_square_index`: Index of the magic square to display (or -1 for all)
   - `scale_factor`: Scale factor for the embedding

3. Render the model using OpenSCAD's render function (F6)

## Features

- Visualizes magic squares as 3D point clouds
- Classifies points as vertices, face points, or interior points
- Displays the convex hull of the point cloud
- Supports multiple magic squares with different geometric properties
- Allows customization of visual parameters

## Geometric Properties

The script includes 20 different magic squares with varying geometric properties:
- Magic squares with 8 to 16 vertices
- Different combinations of face points and interior points
- The "perfect gem" with all 16 points as vertices

## Mathematical Background

The geometric embedding approach reveals several interesting properties of magic squares:

1. The number of hull vertices corresponds to the number of extremal values in the magic square
2. The hull volume relates to the variance of the magic square entries
3. The local dimension suggests that magic squares have 2 degrees of freedom despite having 10 constraints (rows, columns, diagonals)
4. The persistence features correspond to topological invariants of the magic square structure

## Adding New Magic Squares

To add a new magic square to the visualization:

1. Add the magic square matrix to the `magic_squares_with_classification` array
2. Determine which points are vertices, face points, and interior points
3. Add the corresponding indices to the classification arrays

Example:
```scad
[
    [
        [1, 2, 15, 16],
        [13, 14, 4, 3],
        [12, 7, 9, 6],
        [8, 11, 5, 10]
    ],
    [0, 1, 2, 3, 4, 5, 6, 8, 10, 11, 14, 15], // Vertices
    [7], // Face points
    [9, 12, 13] // Interior points
]
```

## References

For more information on the mathematical theory behind this visualization, refer to the paper "Complete Analysis Pipeline for Magic Squares". 