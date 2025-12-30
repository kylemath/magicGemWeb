// Parameters
ring_radius = 70;  // Outer ring radius
ring_thickness = 10;  // Ring thickness
ring_height = 2;    // Outer ring height
num_weights = 16;   // Number of weights
base_sphere_radius = 1;  // Base radius for spheres
sphere_offset = 2;  // Sphere offset from ring

// Inner ring parameters
inner_ring_radius = 20;
inner_ring_thickness = 3;
inner_ring_height = 5;  // Increased height for inner ring (was using ring_height before)

// Support arm parameters
arm_width = 10;
arm_height = 5;
arm_taper = 0.7;  // Taper factor (1 = no taper, 0 = full taper)

// Weights from optimization
weights = [ 8,  3, 14,  9, 12, 15,  5,  4,  2,  7, 11, 16, 10, 13,  1,  6];

// Add angle offset to avoid intersection with arms
sphere_angle_offset = 360 / (num_weights * 2);  // Half the angle between positions (11.25 degrees)

// Balance cone parameters
balance_cone_height = 40;  // Height of the balancing cone
balance_cone_top_radius = inner_ring_radius;  // Matches inner ring radius
balance_cone_tip_radius = 0.5;  // Small radius for balance point

// Add parameters for the stand
stand_height = 10;
stand_radius = 30;
socket_angle = 60;  // Cone socket angle (degrees)
clearance = 0.3;    // Gap between cone and socket for low friction
socket_depth = 3;  // Slightly shallower than cone height

// Create the outer ring
module outer_ring() {
    difference() {
        cylinder(h=ring_height, r=ring_radius + ring_thickness, center=true);
        cylinder(h=ring_height + 1, r=ring_radius, center=true);
    }
}

// Create the inner ring with integrated balance cone
module inner_ring_with_cone() {
    // Inner ring (solid cylinder instead of hollow)
    cylinder(h=inner_ring_height, r=inner_ring_radius + inner_ring_thickness, center=true);
    
    // Integrated balance cone (pointing down)
    translate([0, 0, -(balance_cone_height/2 + inner_ring_height/2)])
    cylinder(h=balance_cone_height, 
            r1=balance_cone_tip_radius, 
            r2=balance_cone_top_radius, 
            center=true);
}

// Create a support arm with improved design
module support_arm() {
    hull() {
        // Inner connection point (stopping at inner ring edge)
        translate([inner_ring_radius + inner_ring_thickness, 0, 0])
        cube([arm_width, arm_width, arm_height], center=true);
        
        // Outer connection point (extending to outer ring edge)
        translate([ring_radius + ring_thickness, 0, 0])
        cube([arm_width * arm_taper, arm_width * arm_taper, arm_height], center=true);
    }
}

// Create a weighted sphere
module weighted_sphere(weight) {
    scale_factor = weight;
    scaled_radius = base_sphere_radius * scale_factor;
    sphere(r=scaled_radius);
}

// Modify the stand to create a cone socket
module stabilizing_stand() {
    difference() {
        // Main stand body
        union() {
            // Base cylinder
            cylinder(h=stand_height, r=stand_radius, center=true);
            
            // Raised rim around socket for stability
            translate([0, 0, stand_height/2])
            difference() {
                cylinder(h=5, r=15, center=true);
                cylinder(h=6, r1=12, r2=8, center=true);
            }
        }
        
        // Cone-shaped socket with clearance
        translate([0, 0, stand_height/2])
        union() {
            // Main cone socket
            cylinder(h=socket_depth, 
                    r1=balance_cone_tip_radius + clearance,
                    r2=balance_cone_top_radius + clearance,
                    center=true);
            
            // Smooth entry chamfer
            translate([0, 0, socket_depth/2])
            cylinder(h=2, r1=balance_cone_top_radius + clearance + 1,
                    r2=balance_cone_top_radius + clearance,
                    center=true);
        }
    }
}

// Main assembly
module weighted_ring() {
    // Move everything up to sit on build plate
    translate([0, 0, ring_height/2]) {
        // Draw the outer ring
        color([0.8, 0.8, 0.8]) outer_ring();
        
        // Draw the inner ring with integrated cone
        translate([0, 0, inner_ring_height/2 - ring_height/2]) {  // Align bottom with outer ring
            color([0.7, 0.7, 0.7]) 
            union() {
                // Inner ring
                cylinder(h=inner_ring_height, r=inner_ring_radius + inner_ring_thickness, center=true);
                
                // Cone now points up from top of inner ring
                translate([0, 0, inner_ring_height/2])  // Position at top of inner ring
                cylinder(h=balance_cone_height, 
                        r2=balance_cone_tip_radius, 
                        r1=balance_cone_top_radius, 
                        center=false);  // Not centered to sit on top
            }
        }
        
        // Draw the support arms
        translate([0, 0, arm_height/2 - ring_height/2])  // Position arms above ring
        color([0.75, 0.75, 0.75])
        for (i = [0:3]) {
            rotate([0, 0, i * 90])
            support_arm();
        }
        
        // Add weighted spheres with offset and moved to rest ON TOP of ring
        for (i = [0:num_weights-1]) {
            angle = i * 360 / num_weights + sphere_angle_offset;
            weight = weights[i];
            
            weight_color = [
                weight/max(weights),
                0.2,
                1 - weight/max(weights),
                0.8
            ];
            
            color(weight_color)
            translate([
                (ring_radius + sphere_offset) * cos(angle),
                (ring_radius + sphere_offset) * sin(angle),
                ring_height/2 + base_sphere_radius * weight  // Changed from negative to positive
            ])
            weighted_sphere(weight);
        }
    }
}

// Render the assembly
weighted_ring();

// // Add the stabilizing stand
// color([0.6, 0.6, 0.6])
// translate([0, 0, -(balance_cone_height + inner_ring_height + 5)])
// stabilizing_stand();