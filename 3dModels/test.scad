// Define all magic squares
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
    // [
    //     [1, 4, 16, 13],
    //     [14, 15, 3, 2],
    //     [11, 10, 6, 7],
    //     [8, 5, 9, 12]
    // ],
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

// Define the size of each square in the grid
square_size = 10;
height_reduction = 10;
grid_spacing = 0; // Space between squares
squares_per_row = 4; // Number of squares per row

// Function to create a single cell with a given height
module cell(x, y, height) {
    translate([x * square_size, y * square_size, 0])
        cube([square_size, square_size, height]);
}

// Function to create a grid of cells for a magic square
module magic_square_grid(magic_square, offset_x, offset_y) {
    translate([offset_x * (square_size * 4 + grid_spacing), 
              offset_y * (square_size * 4 + grid_spacing), 0])
    for (x = [0:3]) {
        for (y = [0:3]) {
            cell(x, y, magic_square[y][x] * square_size / height_reduction);
        }
    }
}

// Create all magic squares in a grid layout
for (i = [0:len(magic_squares)-1]) {
    x_pos = i % squares_per_row;
    y_pos = floor(i / squares_per_row);
    magic_square_grid(magic_squares[i], x_pos, y_pos);
}