// Magic Gem Generator
// Based on the R³ embedding approach described in "Complete Analysis Pipeline for Magic Squares"
// This script converts magic squares into 3D geometric representations

// Define parameters
$fn = 5; // Reduced resolution for faster rendering
point_size = 0.5; // Size of points in the embedding
edge_size = 0.01; // Size of hull vertices
cylinder_size = 0.25; // Size of connecting cylinders
hull_opacity = 0.3; // Opacity of the convex hull faces
show_points = false; // Whether to show the embedded points
show_hull = true; // Whether to show the convex hull
show_edges = false; // Whether to show connecting edges
show_radial_edges = false; // Whether to show radial edges from center to each point
scale_factor = 3; // Scale factor for the embedding
vertical_scale = 0.2; // Vertical scale factor to flatten the shape

// Define magic squares
magic_squares = [
     // 8 vertices, 4 face points, 4 interior points
    [
        [1, 6, 11, 16],
        [14, 12, 5, 3],
        [15, 9, 8, 2],
        [4, 7, 10, 13]
    ],
    // 9 vertices, 3 face points, 4 interior points
    [
        [1, 5, 16, 12],
        [15, 14, 3, 2],
        [10, 11, 6, 7],
        [8, 4, 9, 13]
    ],
    // 10 vertices, 2 face points, 4 interior points
    [
        [1, 3, 14, 16],
        [15, 13, 4, 2],
        [10, 6, 11, 7],
        [8, 12, 5, 9]
    ],
    // // 10 vertices, 3 face points, 3 interior points
    [
        [1, 4, 16, 13],
        [14, 15, 3, 2],
        [11, 10, 6, 7],
        [8, 5, 9, 12]
    ],
    // 10 vertices, 4 face points, 2 interior points
    [
        [1, 4, 13, 16],
        [15, 14, 3, 2],
        [8, 5, 12, 9],
        [10, 11, 6, 7]
    ],
    // 10 vertices, 6 face points, 0 interior points
    [
        [1, 4, 13, 16],
        [8, 14, 3, 9],
        [15, 5, 12, 2],
        [10, 11, 6, 7]
    ],
    // 11 vertices, 1 face points, 4 interior points
    [
        [1, 4, 14, 15],
        [16, 13, 3, 2],
        [11, 10, 8, 5],
        [6, 7, 9, 12]
    ],
    // 11 vertices, 2 face points, 3 interior points
    [
        [1, 4, 14, 15],
        [16, 13, 3, 2],
        [7, 6, 12, 9],
        [10, 11, 5, 8]
    ],
    // 11 vertices, 3 face points, 2 interior points
    [
        [1, 6, 15, 12],
        [16, 11, 2, 5],
        [4, 7, 14, 9],
        [13, 10, 3, 8]
    ],
    // 12 vertices, 0 face points, 4 interior points
    [
        [1, 3, 14, 16],
        [10, 13, 4, 7],
        [15, 6, 11, 2],
        [8, 12, 5, 9]
    ],
    // 12 vertices, 1 face points, 3 interior points
    [
        [1, 2, 16, 15],
        [13, 14, 4, 3],
        [12, 7, 9, 6],
        [8, 11, 5, 10]
    ],
    // 12 vertices, 2 face points, 2 interior points
    [
        [1, 2, 15, 16],
        [12, 14, 3, 5],
        [13, 7, 10, 4],
        [8, 11, 6, 9]
    ],
    // 12 vertices, 4 face points, 0 interior points
    [
        [1, 6, 11, 16],
        [7, 15, 2, 10],
        [14, 4, 13, 3],
        [12, 9, 8, 5]
    ],
    // 13 vertices, 0 face points, 3 interior points
    [
        [1, 10, 16, 7],
        [15, 8, 2, 9],
        [4, 11, 13, 6],
        [14, 5, 3, 12]
    ],
    // 13 vertices, 1 face points, 2 interior points
    [
        [1, 3, 16, 14],
        [12, 15, 2, 5],
        [13, 10, 7, 4],
        [8, 6, 9, 11]
    ],
    // 13 vertices, 2 face points, 1 interior points
    [
        [1, 5, 16, 12],
        [8, 14, 3, 9],
        [10, 4, 13, 7],
        [15, 11, 2, 6]
    ],
    // 14 vertices, 0 face points, 2 interior points
    [
        [1, 2, 15, 16],
        [13, 14, 3, 4],
        [12, 7, 10, 5],
        [8, 11, 6, 9]
    ],
    // 14 vertices, 1 face points, 1 interior points
    [
        [5, 2, 16, 11],
        [12, 15, 1, 6],
        [9, 14, 4, 7],
        [8, 3, 13, 10]
    ],
    // 14 vertices, 2 face points, 0 interior points
    [
        [1, 4, 13, 16],
        [14, 15, 2, 3],
        [8, 5, 12, 9],
        [11, 10, 7, 6]
    ],
    // 15 vertices, 0 face points, 1 interior points
    [
        [1, 4, 14, 15],
        [13, 16, 2, 3],
        [8, 5, 11, 10],
        [12, 9, 7, 6]
    ],
    // 16 vertices, 0 face points, 0 interior points
    [
        [1, 4, 13, 16],
        [8, 15, 2, 9],
        [14, 5, 12, 3],
        [11, 10, 7, 6]
    ]
];

// Function to convert 1D index to 3D coordinates (i, j, value)
function index_to_coords(idx, square) = 
    let(
        i = floor(idx / 4),
        j = idx % 4,
        value = square[i][j]
    )
    // Center the square in XY plane and scale Z independently
    [
        (j - 1.5) * scale_factor,  // Center X
        (i - 1.5) * scale_factor,  // Center Y
        value * scale_factor * vertical_scale  // Scale Z
    ];

// Function to get all point coordinates for a square
function get_all_points(square) = 
    [for (i = [0:15]) index_to_coords(i, square)];

// Function to calculate the centroid of a set of points
function centroid(points) =
    let(
        sum_x = sum([for (p = points) p[0]]),
        sum_y = sum([for (p = points) p[1]]),
        sum_z = sum([for (p = points) p[2]]),
        n = len(points)
    )
    [sum_x/n, sum_y/n, sum_z/n];

// Function to sum a list of values
function sum(list) = 
    [for(i = list) 1] * list;

// Module to create a cylinder between two points
module connect_points(p1, p2) {
    // Calculate the vector between points
    v = p2 - p1;
    // Calculate length and rotation
    h = norm(v);
    if (h > 0) {  // Only create cylinder if points are different
        // Create the cylinder
        translate(p1)
            rotate([0, 
                    acos(v.z/h), // Rotation around Y
                    atan2(v.y, v.x)  // Rotation around Z
                   ])
                cylinder(h=h, d=cylinder_size, center=false);
    }
}

// Module to create all possible connections between points
module create_all_connections(points) {
    // Connect every point with every other point
    for (i = [0:len(points)-1]) {
        for (j = [i+1:len(points)-1]) {
            connect_points(points[i], points[j]);
        }
    }
}

// Function to determine if a point is on the convex hull
function is_hull_point(point, points) =
    let(
        eps = 1.5,
        others = [for(p = points) if(p != point) p],
        center = centroid(others)
    )
    norm(point - center) >= max([for(p = others) norm(p - center)]) - eps;

// Function to get hull points
function get_hull_points(points) =
    [for(p = points) if(is_hull_point(p, points)) p];

// Module to create hull edge connections
module create_hull_edges(points) {
    hull_points = get_hull_points(points);
    
    // Connect each hull point to its nearest neighbors
    for (i = [0:len(hull_points)-1]) {
        for (j = [i+1:len(hull_points)-1]) {
            // Only connect if they form a hull edge
            if (norm(hull_points[i] - hull_points[j]) <= scale_factor * 4.5) {
                connect_points(hull_points[i], hull_points[j]);
            }
        }
    }
}

// Module to create radial connections from center to each point
module create_radial_connections(points) {
    // Calculate the centroid
    center = centroid(points);
    
    // Connect center to each point
    for (i = [0:len(points)-1]) {
        connect_points(center, points[i]);
    }
    
    // // Add hull edges in the same color as radial edges
    // create_hull_edges(points);
    
    // Show the center point
    color([0, 0.5, 1])
        translate(center)
            sphere(d=cylinder_size*2);
}

// Module to create a magic square gem
module magic_square_gem(square) {
    points = get_all_points(square);
    
    difference() {
        union() {
            // Create the convex hull using hidden cubes
            if (show_hull) {
                // Create hull faces with transparency
                color([0.8, 0.8, 0.8, hull_opacity])
                    hull() {
                        for (p = points) {
                            translate(p)
                                cube([edge_size, edge_size, edge_size], center=true);
                        }
                    }
            }
            
            // Show connecting edges if enabled
            if (show_edges) {
                color([0.5, 0.5, 0.5, 0.8])
                    create_all_connections(points);
            }
            
            // Show radial edges if enabled
            if (show_radial_edges) {
                color([0.3, 0.7, 0.9, 0.8])
                    create_radial_connections(points);
            }
            
            // Show points as spheres if enabled
            if (show_points) {
                for (p = points) {
                    color([1, 0, 0])
                        translate(p)
                            sphere(d=point_size);
                }
            }
        }
        
        // Cut off bottom to make it sit flat
        translate([-50, -50, -50])
            cube([100, 100, 50]);
    }
}

// Display the selected magic square
magic_square_gem(magic_squares[2]); 