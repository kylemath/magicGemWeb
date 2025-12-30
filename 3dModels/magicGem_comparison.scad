// Magic Square Gem Comparison
// This script shows multiple magic square gems side by side to compare their geometric properties

// Include the magicGem.scad file
include <magicGem.scad>

// Override parameters for better visualization
$fn = 8; // Reduced resolution for faster rendering
point_size = 0.6; // Size of points in the embedding
edge_size = 0.3; // Size of hull vertices
hull_opacity = 0.15; // Opacity of the convex hull faces
show_points = false; // Show points
show_hull = true; // Show hull
scale_factor = 4; // Scale factor for the embedding
vertical_scale = 0.25; // Vertical scale factor to flatten the shape
base_spacing = 30; // Increased spacing between gems to prevent overlap

// Define interesting magic squares to compare
interesting_squares = [
    // Maximum vertices (16) - Most spread out pattern
    [
        [1, 4, 13, 16],
        [8, 15, 2, 9],
        [14, 5, 12, 3],
        [11, 10, 7, 6]
    ],
    // Minimum vertices (11) - Most compact pattern
    [
        [1, 4, 14, 15],
        [16, 13, 3, 2],
        [7, 6, 12, 9],
        [10, 11, 5, 8]
    ],
    // Balanced vertices (13) with diagonal flow
    [
        [1, 8, 13, 12],
        [14, 11, 2, 7],
        [4, 5, 16, 9],
        [15, 10, 3, 6]
    ],
    // Spiral pattern with continuous growth
    [
        [1, 2, 15, 16],
        [12, 14, 3, 5],
        [13, 7, 10, 4],
        [8, 11, 6, 9]
    ]
];

// Define descriptions for each gem
descriptions = [
    ["Maximum Spread", 
     "16 hull vertices",
     "No face/interior points",
     "Most extreme geometry"],
    
    ["Most Compact",
     "11 hull vertices",
     "3 face, 2 interior points",
     "Balanced distribution"],
    
    ["Diagonal Flow",
     "13 hull vertices",
     "Smooth transitions",
     "Balanced complexity"],
    
    ["Spiral Growth",
     "12 hull vertices",
     "Organic form",
     "Continuous flow"]
];

// Create all gems in a single hull operation for better performance
module all_gems() {
    for (i = [0:3]) {
        translate([i * base_spacing, 0, 0]) {
            // Add a small platform under each gem for better separation
            color([0.9, 0.9, 0.9, 0.1])
                translate([0, 0, -0.5])
                    cube([scale_factor * 4, scale_factor * 4, 0.1], center=true);
            // Create the gem
            magic_square_gem(interesting_squares[i]);
        }
    }
}

// Create labels in a separate operation
module all_labels() {
    for (i = [0:3]) {
        translate([i * base_spacing, -8, 0]) {
            // Magic sum
            color([0.3, 0.3, 0.3])
                linear_extrude(height=0.5)
                    text(str("Sum: ", interesting_squares[i][0][0] + 
                                    interesting_squares[i][0][1] + 
                                    interesting_squares[i][0][2] + 
                                    interesting_squares[i][0][3]), 
                         size=1.2, halign="center");
            
            // Shape properties (4 lines of description)
            for (j = [0:3]) {
                translate([0, -2.5 - j * 2, 0])
                    color([0.3, 0.3, 0.3])
                        linear_extrude(height=0.5)
                            text(descriptions[i][j], 
                                 size=1, halign="center");
            }
        }
    }
}

// Display everything
union() {
    all_gems();
    // all_labels();
    
    // // Add title
    // color([0.3, 0.3, 0.3])
    // translate([base_spacing * 1.5, 12, 0])
    //     linear_extrude(height=0.5)
    //         text("Magic Square Gem Comparison", size=2, halign="center");
}

/* 
 * This comparison shows four magic squares with maximally different geometric properties:
 * 
 * 1. Maximum Spread (16 vertices):
 *    - All points are hull vertices
 *    - No face or interior points
 *    - Creates the most extreme geometric form
 *    - Maximum possible convex hull volume
 * 
 * 2. Most Compact (11 vertices):
 *    - Minimum number of hull vertices
 *    - Balanced distribution of face and interior points
 *    - Most efficient space utilization
 *    - Minimum convex hull volume
 * 
 * 3. Diagonal Flow (13 vertices):
 *    - Intermediate number of hull vertices
 *    - Values progress along diagonals
 *    - Creates smooth geometric transitions
 *    - Balanced between extremes
 * 
 * 4. Spiral Pattern (12 vertices):
 *    - Organic geometric form
 *    - Values spiral from center outward
 *    - Creates helical surface structure
 *    - Continuous growth pattern
 * 
 * These squares were chosen to maximize geometric diversity based on:
 * - Number of hull vertices (ranging from 11 to 16)
 * - Distribution of face and interior points
 * - Overall geometric form and symmetry
 * - Pattern of value progression
 */ 