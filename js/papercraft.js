/**
 * Paper Craft Net Generator for Magic Gems
 * Unfolds 3D convex hull into 2D template
 */

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

class PapercraftGenerator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.showLabels = true;
        this.showEdgeLengths = false;
        this.showGlueTabs = true;
        this.showCellValues = true;
        this.scale = 50; // pixels per unit
        this.padding = 50;
        this.glueTabWidth = 0.3; // Width of glue tabs in units
        this.currentNet = null; // Store the current net for export
        this.generateVariation = false; // Flag for generating different layouts
    }
    
    /**
     * Generate net from magic square and convex hull
     * Uses actual 3D viewer hull data if available
     */
    generateNet(square, epsilon = 0.001, hullData = null) {
        // Use hull data from 3D viewer if provided
        let faces, faceGroups;
        
        if (hullData && hullData.faces) {
            faces = hullData.faces;
            faceGroups = this.convertGroups(hullData.groups);
        } else {
            // Fallback to simplified computation with normalized coordinates
            const n = square.length;
            const coords = MagicSquares.toCoordinates(square, true); // normalized=true
            const points3D = coords.map(c => ({ x: c.x, y: c.y, z: c.z }));
            const hull = this.computeSimplifiedHull(points3D);
            faces = hull.faces;
            faceGroups = this.groupSimilarFaces(faces, points3D, epsilon);
        }
        
        // Unfold the hull into 2D
        const net = this.unfoldHull(faces, faceGroups);
        
        // Draw the net
        this.drawNet(net, faceGroups);
        
        const uniqueEdges = this.countUniqueEdges(faces);
        
        return {
            faces: faces.length,
            groups: faceGroups.length,
            edges: uniqueEdges
        };
    }
    
    convertGroups(groups) {
        const palette = [
            '#2f4f4f', '#7f0000', '#008000', '#000080',
            '#ff0000', '#00ced1', '#ffa500', '#7fff00',
            '#00fa9a', '#0000ff', '#ff00ff', '#1e90ff',
            '#eee8aa', '#ffff54', '#dda0dd', '#ff1493'
        ];
        
        return groups.map((group, i) => ({
            indices: group,
            color: palette[i % palette.length]
        }));
    }
    
    countUniqueEdges(faces) {
        const edges = new Set();
        faces.forEach(face => {
            for (let i = 0; i < 3; i++) {
                edges.add(this.edgeKey(face[i], face[(i+1)%3]));
            }
        });
        return edges.size;
    }
    
    /**
     * Compute a simplified convex hull (using gift wrapping for visualization)
     */
    computeSimplifiedHull(points) {
        // For 4x4, we know we should get 20 triangular faces
        // Use a simple approach: create faces from extreme points
        const faces = [];
        const edges = new Set();
        
        // Find extreme points
        const sorted = {
            minX: [...points].sort((a, b) => a.x - b.x),
            maxX: [...points].sort((a, b) => b.x - a.x),
            minY: [...points].sort((a, b) => a.y - b.y),
            maxY: [...points].sort((a, b) => b.y - a.y),
            minZ: [...points].sort((a, b) => a.z - b.z),
            maxZ: [...points].sort((a, b) => b.z - a.z)
        };
        
        // Create faces by connecting nearby extreme points
        // This is a simplified approximation for visualization
        const extremeIndices = new Set();
        Object.values(sorted).forEach(arr => {
            for (let i = 0; i < Math.min(4, arr.length); i++) {
                extremeIndices.add(points.indexOf(arr[i]));
            }
        });
        
        const extremePoints = Array.from(extremeIndices).map(i => points[i]);
        
        // Generate faces by connecting triplets of nearby points
        for (let i = 0; i < extremePoints.length; i++) {
            for (let j = i + 1; j < extremePoints.length; j++) {
                for (let k = j + 1; k < extremePoints.length; k++) {
                    const face = [
                        extremePoints[i],
                        extremePoints[j],
                        extremePoints[k]
                    ];
                    
                    // Check if face is on convex hull (all other points on one side)
                    if (this.isFaceOnHull(face, points)) {
                        faces.push(face);
                        
                        // Add edges
                        edges.add(this.edgeKey(face[0], face[1]));
                        edges.add(this.edgeKey(face[1], face[2]));
                        edges.add(this.edgeKey(face[2], face[0]));
                    }
                }
            }
        }
        
        return { faces: faces.slice(0, 20), edges: Array.from(edges) }; // Limit to ~20 faces
    }
    
    isFaceOnHull(face, allPoints) {
        const normal = this.computeNormal(face);
        const center = {
            x: (face[0].x + face[1].x + face[2].x) / 3,
            y: (face[0].y + face[1].y + face[2].y) / 3,
            z: (face[0].z + face[1].z + face[2].z) / 3
        };
        
        let sign = null;
        for (const p of allPoints) {
            const dot = normal.x * (p.x - center.x) +
                       normal.y * (p.y - center.y) +
                       normal.z * (p.z - center.z);
            
            if (Math.abs(dot) > 0.001) {
                if (sign === null) {
                    sign = Math.sign(dot);
                } else if (Math.sign(dot) !== sign) {
                    return false;
                }
            }
        }
        return true;
    }
    
    computeNormal(face) {
        const v1 = {
            x: face[1].x - face[0].x,
            y: face[1].y - face[0].y,
            z: face[1].z - face[0].z
        };
        const v2 = {
            x: face[2].x - face[0].x,
            y: face[2].y - face[0].y,
            z: face[2].z - face[0].z
        };
        
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }
    
    edgeKey(p1, p2) {
        const key1 = `${p1.x.toFixed(3)},${p1.y.toFixed(3)},${p1.z.toFixed(3)}`;
        const key2 = `${p2.x.toFixed(3)},${p2.y.toFixed(3)},${p2.z.toFixed(3)}`;
        return key1 < key2 ? `${key1}-${key2}` : `${key2}-${key1}`;
    }
    
    /**
     * Group similar faces by geometry
     */
    groupSimilarFaces(faces, points, epsilon) {
        const groups = [];
        const used = new Set();
        
        for (let i = 0; i < faces.length; i++) {
            if (used.has(i)) continue;
            
            const group = { indices: [i], color: null };
            used.add(i);
            
            const char1 = this.getFaceCharacteristics(faces[i]);
            
            for (let j = i + 1; j < faces.length; j++) {
                if (used.has(j)) continue;
                
                const char2 = this.getFaceCharacteristics(faces[j]);
                
                if (this.areFacesSimilar(char1, char2, epsilon)) {
                    group.indices.push(j);
                    used.add(j);
                }
            }
            
            groups.push(group);
        }
        
        // Assign colors from palette
        const palette = [
            '#2f4f4f', '#7f0000', '#008000', '#000080',
            '#ff0000', '#00ced1', '#ffa500', '#7fff00',
            '#00fa9a', '#0000ff', '#ff00ff', '#1e90ff',
            '#eee8aa', '#ffff54', '#dda0dd', '#ff1493'
        ];
        
        groups.forEach((group, i) => {
            group.color = palette[i % palette.length];
        });
        
        return groups;
    }
    
    getFaceCharacteristics(face) {
        const edges = [];
        for (let i = 0; i < 3; i++) {
            const v1 = face[i];
            const v2 = face[(i + 1) % 3];
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const dz = v2.z - v1.z;
            edges.push(Math.sqrt(dx*dx + dy*dy + dz*dz));
        }
        edges.sort();
        
        const angles = [];
        for (let i = 0; i < 3; i++) {
            const v1 = face[i];
            const v2 = face[(i + 1) % 3];
            const v3 = face[(i + 2) % 3];
            
            const e1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
            const e2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
            
            const dot = e1.x*e2.x + e1.y*e2.y + e1.z*e2.z;
            const len1 = Math.sqrt(e1.x*e1.x + e1.y*e1.y + e1.z*e1.z);
            const len2 = Math.sqrt(e2.x*e2.x + e2.y*e2.y + e2.z*e2.z);
            
            angles.push(Math.acos(dot / (len1 * len2)));
        }
        angles.sort();
        
        return { edges, angles };
    }
    
    areFacesSimilar(char1, char2, epsilon) {
        for (let i = 0; i < 3; i++) {
            if (Math.abs(char1.edges[i] - char2.edges[i]) > epsilon) return false;
            if (Math.abs(char1.angles[i] - char2.angles[i]) > epsilon) return false;
        }
        return true;
    }
    
    /**
     * Unfold hull into 2D net with connected faces (proper paper craft template)
     * Uses "cube cutout" style: find top/bottom, create belt strip, attach ends
     */
    unfoldHull(faces, faceGroups) {
        const net = [];
        
        if (faces.length === 0) return net;

        // For small polyhedra (e.g., 3×3 magic gem with ~8 faces), use a deterministic
        // cube-cutout style layout to avoid overlaps.
        if (faces.length <= 10) {
            return this.unfoldSmallPolyhedron(faces, faceGroups);
        }
        
        // Build face adjacency graph
        const adjacency = this.buildFaceAdjacency(faces);
        
        // Find top and bottom faces (parallel faces, likely with extreme z-values)
        const { topFace, bottomFace } = this.findTopBottomFaces(faces);
        
        // Build belt/strip of faces around the middle
        console.log('Top face:', topFace, 'Bottom face:', bottomFace);
        const belt = this.buildBelt(faces, adjacency, topFace, bottomFace);
        console.log('Belt faces:', belt);
        
        // Create strip layout: belt in middle, top on one side, bottom on other
        const layout = this.createStripLayout(faces, belt, topFace, bottomFace, adjacency, faceGroups);
        console.log('Generated layout with', layout.length, 'faces');
        
        // Ensure all faces are included
        if (layout.length < faces.length) {
            console.warn(`Missing ${faces.length - layout.length} faces! Adding remaining...`);
            const included = new Set(layout.map(n => n.faceIndex));
            
            for (let i = 0; i < faces.length; i++) {
                if (included.has(i)) continue;
                
                // Find any adjacent face that's already in the net
                let connectedTo = null;
                if (adjacency[i]) {
                    for (const adj of adjacency[i]) {
                        const existing = layout.find(n => n.faceIndex === adj.faceIndex);
                        if (existing) {
                            connectedTo = existing;
                            break;
                        }
                    }
                }
                
                // Place this face adjacent to an existing one, or at a safe distance
                let vertices2D;
                if (connectedTo) {
                    const sharedEdge = adjacency[i].find(a => a.faceIndex === connectedTo.faceIndex);
                    if (sharedEdge) {
                        vertices2D = this.placeFaceAlongSharedEdge(
                            faces[i],
                            connectedTo.vertices2D,
                            sharedEdge.currentIndices,
                            sharedEdge.neighborIndices,
                            0
                        );
                    } else {
                        // Place at offset
                        const offsetX = 5;
                        const offsetY = 5;
                        vertices2D = this.project3DTriangleTo2D(faces[i], offsetX, offsetY, 0);
                    }
                } else {
                    // Place at offset
                    const offsetX = 5;
                    const offsetY = 5;
                    vertices2D = this.project3DTriangleTo2D(faces[i], offsetX, offsetY, 0);
                }
                
                layout.push({
                    face: faces[i],
                    vertices2D: vertices2D,
                    groupIndex: this.getFaceGroupIndex(i, faceGroups),
                    faceIndex: i,
                    connectedTo: connectedTo ? connectedTo.faceIndex : null
                });
            }
        }
        
        console.log(`Unfolded ${layout.length} faces out of ${faces.length} total`);
        
        return layout;
    }

    /**
     * Deterministic layout for small polyhedra (<=10 faces).
     * Strategy:
     * - Find top and bottom faces (extreme z centroids).
     * - Order remaining faces around vertical axis by centroid angle.
     * - Lay out a horizontal strip of side faces in that order.
     * - Attach top above the first side; bottom below the opposite side.
     */
    unfoldSmallPolyhedron(faces, faceGroups) {
        const net = [];
        const adjacency = this.buildFaceAdjacency(faces);

        // Identify top/bottom by centroid z
        const centroids = faces.map(f => ({
            z: (f[0].z + f[1].z + f[2].z) / 3,
            face: f
        }));
        let topIdx = 0, bottomIdx = 0;
        centroids.forEach((c, i) => {
            if (c.z > centroids[topIdx].z) topIdx = i;
            if (c.z < centroids[bottomIdx].z) bottomIdx = i;
        });

        // Side faces = all except top/bottom
        const sideFaces = [];
        for (let i = 0; i < faces.length; i++) {
            if (i !== topIdx && i !== bottomIdx) {
                const c = centroids[i];
                const cx = (faces[i][0].x + faces[i][1].x + faces[i][2].x) / 3;
                const cy = (faces[i][0].y + faces[i][1].y + faces[i][2].y) / 3;
                const angle = Math.atan2(cy, cx);
                sideFaces.push({ idx: i, angle });
            }
        }

        // Order side faces by angle around vertical axis
        sideFaces.sort((a, b) => a.angle - b.angle);

        // Place first side face at origin
        const stripY = 0;
        let currentX = 0;
        let lastIdx = null;
        const placed = new Map();

        const placeFace = (faceIdx, refNet, sharedEdge, flip = 0) => {
            let verts;
            if (refNet && sharedEdge) {
                verts = this.placeFaceAlongSharedEdge(
                    faces[faceIdx],
                    refNet.vertices2D,
                    sharedEdge.neighborIndices,
                    sharedEdge.currentIndices,
                    flip
                );
            } else {
                verts = this.project3DTriangleTo2D(faces[faceIdx], currentX, stripY, 0);
            }
            const entry = {
                face: faces[faceIdx],
                vertices2D: verts,
                groupIndex: this.getFaceGroupIndex(faceIdx, faceGroups),
                faceIndex: faceIdx,
                connectedTo: refNet ? refNet.faceIndex : null
            };
            net.push(entry);
            placed.set(faceIdx, entry);
            const box = this.getBoundingBox(verts);
            currentX = box.maxX;
            return entry;
        };

        if (sideFaces.length > 0) {
            const first = sideFaces[0].idx;
            const entry = placeFace(first, null, null, 0);
            lastIdx = first;

            // Lay out remaining side faces along the strip
            for (let i = 1; i < sideFaces.length; i++) {
                const idx = sideFaces[i].idx;
                let shared = null;
                if (adjacency[idx]) {
                    shared = adjacency[idx].find(n => n.faceIndex === lastIdx);
                }
                const ref = placed.get(lastIdx);
                placeFace(idx, ref, shared, 0);
                lastIdx = idx;
            }
        }

        // Helper to attach a face to the strip
        const attachFace = (faceIdx, preferIdx, flipSide) => {
            if (placed.has(faceIdx)) return;
            let connection = null;
            if (adjacency[faceIdx]) {
                // Try preferred connection first
                if (preferIdx !== null && adjacency[faceIdx]) {
                    connection = adjacency[faceIdx].find(n => n.faceIndex === preferIdx);
                }
                // Otherwise any placed neighbor
                if (!connection) {
                    connection = adjacency[faceIdx].find(n => placed.has(n.faceIndex));
                }
            }
            const ref = connection ? placed.get(connection.faceIndex) : net[0];
            const shared = connection || (adjacency[faceIdx] ? adjacency[faceIdx][0] : null);
            placeFace(faceIdx, ref, shared, flipSide);
        };

        // Attach top above first side, bottom below opposite side
        if (sideFaces.length > 0) {
            attachFace(topIdx, sideFaces[0].idx, 0);
            const oppIdx = sideFaces[Math.floor(sideFaces.length / 2)] ? sideFaces[Math.floor(sideFaces.length / 2)].idx : sideFaces[0].idx;
            attachFace(bottomIdx, oppIdx, 1);
        } else {
            // Degenerate: just place top/bottom
            placeFace(topIdx, null, null, 0);
            placeFace(bottomIdx, null, null, 1);
        }

        // Any remaining faces (shouldn't happen)
        for (let i = 0; i < faces.length; i++) {
            if (!placed.has(i)) {
                placeFace(i, net[0], null, 0);
            }
        }

        return net;
    }
    
    /**
     * Build conflict network: faces that would overlap if both unfolded
     * Based on dihedral angles - sharp angles indicate potential conflicts
     */
    buildConflictNetwork(faces, adjacency) {
        const conflicts = {};
        const conflictThreshold = Math.PI / 3; // 60 degrees - faces at sharper angles conflict
        
        for (let i = 0; i < faces.length; i++) {
            conflicts[i] = new Set();
        }
        
        // For each face, check conflicts with non-adjacent faces
        for (let i = 0; i < faces.length; i++) {
            const faceI = faces[i];
            const normalI = this.computeNormal(faceI);
            
            // Get all adjacent faces
            const adjacentSet = new Set();
            if (adjacency[i]) {
                adjacency[i].forEach(n => adjacentSet.add(n.faceIndex));
            }
            
            for (let j = i + 1; j < faces.length; j++) {
                // Skip if adjacent (they share an edge, so can be connected)
                if (adjacentSet.has(j)) continue;
                
                const faceJ = faces[j];
                const normalJ = this.computeNormal(faceJ);
                
                // Calculate dihedral angle (angle between normals)
                const dot = normalI.x * normalJ.x + normalI.y * normalJ.y + normalI.z * normalJ.z;
                const lenI = Math.sqrt(normalI.x**2 + normalI.y**2 + normalI.z**2);
                const lenJ = Math.sqrt(normalJ.x**2 + normalJ.y**2 + normalJ.z**2);
                const cosAngle = dot / (lenI * lenJ);
                const dihedralAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
                
                // Faces at sharp angles (< threshold) conflict when unfolded
                // Also check if they're on opposite sides (angle > 90°)
                if (dihedralAngle < conflictThreshold || dihedralAngle > Math.PI - conflictThreshold) {
                    conflicts[i].add(j);
                    conflicts[j].add(i);
                }
            }
        }
        
        return conflicts;
    }
    
    /**
     * Create spanning tree that avoids conflicts
     */
    createConflictAwareSpanningTree(numFaces, adjacency, conflictNetwork, symmetryGroups, startFace = null) {
        const tree = {};
        
        // Choose random starting face if not specified
        if (startFace === null || startFace === undefined) {
            startFace = this.generateVariation ? Math.floor(Math.random() * numFaces) : 0;
        }
        
        const visited = new Set([startFace]);
        const queue = [startFace];
        
        for (let i = 0; i < numFaces; i++) {
            tree[i] = [];
        }
        
        // BFS that prioritizes non-conflicting neighbors
        while (queue.length > 0 && visited.size < numFaces) {
            const current = queue.shift();
            const neighbors = [...(adjacency[current] || [])];
            
            // Score neighbors: prefer those with fewer conflicts with already-visited faces
            neighbors.forEach(n => {
                n.conflictScore = 0;
                visited.forEach(v => {
                    if (conflictNetwork[n.faceIndex] && conflictNetwork[n.faceIndex].has(v)) {
                        n.conflictScore++;
                    }
                });
            });
            
            // Sort: unvisited first, then by conflict score (lower is better)
            neighbors.sort((a, b) => {
                const aVisited = visited.has(a.faceIndex) ? 1 : 0;
                const bVisited = visited.has(b.faceIndex) ? 1 : 0;
                if (aVisited !== bVisited) return aVisited - bVisited;
                return a.conflictScore - b.conflictScore;
            });
            
            // Shuffle if generating variation (but still respect conflict scores)
            if (this.generateVariation) {
                // Shuffle neighbors with same conflict score
                let i = 0;
                while (i < neighbors.length) {
                    const score = neighbors[i].conflictScore;
                    const sameScore = [];
                    while (i < neighbors.length && neighbors[i].conflictScore === score) {
                        sameScore.push(neighbors[i]);
                        i++;
                    }
                    if (sameScore.length > 1) {
                        this.shuffleArray(sameScore);
                        neighbors.splice(i - sameScore.length, sameScore.length, ...sameScore);
                    }
                }
            }
            
            for (const neighborInfo of neighbors) {
                const neighborIdx = neighborInfo.faceIndex;
                
                if (visited.has(neighborIdx)) continue;
                
                tree[current].push(neighborInfo);
                visited.add(neighborIdx);
                queue.push(neighborIdx);
            }
        }
        
        // If not all faces visited, add remaining ones (force inclusion)
        if (visited.size < numFaces) {
            console.warn(`Only visited ${visited.size} of ${numFaces} faces. Adding remaining...`);
            const remaining = [];
            for (let i = 0; i < numFaces; i++) {
                if (!visited.has(i)) remaining.push(i);
            }
            
            // Try to connect each remaining face to any visited adjacent face
            for (const faceIdx of remaining) {
                if (adjacency[faceIdx] && adjacency[faceIdx].length > 0) {
                    // Find first adjacent face that's already visited
                    for (const adj of adjacency[faceIdx]) {
                        if (visited.has(adj.faceIndex)) {
                            tree[adj.faceIndex].push({
                                faceIndex: faceIdx,
                                sharedEdge: adj.sharedEdge
                            });
                            visited.add(faceIdx);
                            queue.push(faceIdx);
                            break;
                        }
                    }
                }
            }
            
            // If still missing, connect to any face (even if not adjacent - will handle in layout)
            if (visited.size < numFaces) {
                const stillMissing = [];
                for (let i = 0; i < numFaces; i++) {
                    if (!visited.has(i)) stillMissing.push(i);
                }
                console.warn(`Still missing ${stillMissing.length} faces after retry`);
            }
        }
        
        return { tree, startFace };
    }
    
    /**
     * Create layout that avoids conflicts
     */
    createConflictAwareLayout(faces, spanningTree, conflictNetwork, faceGroups, startFace = 0) {
        const net = [];
        const visited = new Set([startFace]);
        const occupiedSpace = [];
        
        // Start with specified face at origin
        const startX = 0;
        const startY = 0;
        const vertices2D = this.project3DTriangleTo2D(faces[startFace], startX, startY, 0);
        
        net.push({
            face: faces[startFace],
            vertices2D: vertices2D,
            groupIndex: this.getFaceGroupIndex(startFace, faceGroups),
            faceIndex: startFace,
            connectedTo: null
        });
        occupiedSpace.push({ vertices: vertices2D, index: startFace });
        
        // Process faces level by level
        const toProcess = [{ faceIdx: startFace, level: 0 }];
        
        while (toProcess.length > 0 && visited.size < faces.length) {
            const { faceIdx: currentFaceIdx, level } = toProcess.shift();
            const currentNet = net.find(n => n.faceIndex === currentFaceIdx);
            
            if (!currentNet) continue;
            
            const children = spanningTree[currentFaceIdx] || [];
            
            // Try multiple orientations for each child to avoid overlaps
            for (const childInfo of children) {
                const childIdx = childInfo.faceIndex;
                
                if (visited.has(childIdx)) continue;
                
                const sharedEdge = childInfo.sharedEdge;
                
                // Check if this face conflicts with already-placed faces
                const hasConflict = Array.from(visited).some(v => 
                    conflictNetwork[childIdx] && conflictNetwork[childIdx].has(v)
                );
                
                // Try both flip orientations
                let bestPlacement = null;
                let minOverlap = Infinity;
                
                for (let flip = 0; flip < 2; flip++) {
                    const newVertices2D = this.placeFaceAlongSharedEdge(
                        faces[childIdx],
                        currentNet.vertices2D,
                        sharedEdge.currentIndices,
                        sharedEdge.neighborIndices,
                        flip
                    );
                    
                    // Calculate overlap score (weight conflicts more heavily)
                    let overlapScore = this.calculateOverlapScore(newVertices2D, occupiedSpace, currentFaceIdx);
                    
                    // Penalize conflicts with already-placed faces
                    if (hasConflict) {
                        overlapScore += 10; // Heavy penalty
                    }
                    
                    if (overlapScore < minOverlap) {
                        minOverlap = overlapScore;
                        bestPlacement = newVertices2D;
                    }
                    
                    // If no overlap and no conflict, use this immediately
                    if (overlapScore === 0 && !hasConflict) break;
                }
                
                if (minOverlap > 0) {
                    console.warn(`Face ${childIdx} has overlap score: ${minOverlap.toFixed(3)}`);
                }
                
                net.push({
                    face: faces[childIdx],
                    vertices2D: bestPlacement,
                    groupIndex: this.getFaceGroupIndex(childIdx, faceGroups),
                    faceIndex: childIdx,
                    connectedTo: currentFaceIdx
                });
                
                occupiedSpace.push({ vertices: bestPlacement, index: childIdx });
                visited.add(childIdx);
                toProcess.push({ faceIdx: childIdx, level: level + 1 });
            }
        }
        
        return net;
    }
    
    /**
     * Find top and bottom faces (parallel faces, typically with extreme z-values)
     */
    findTopBottomFaces(faces) {
        // Calculate face normals and z-extents
        const faceData = faces.map((face, idx) => {
            const normal = this.computeNormal(face);
            const centroid = {
                x: (face[0].x + face[1].x + face[2].x) / 3,
                y: (face[0].y + face[1].y + face[2].y) / 3,
                z: (face[0].z + face[1].z + face[2].z) / 3
            };
            const area = this.computeFaceArea(face);
            
            return {
                index: idx,
                normal,
                centroid,
                area,
                z: centroid.z
            };
        });
        
        // Find faces with most extreme z-values
        faceData.sort((a, b) => a.z - b.z);
        const bottomFace = faceData[0].index;
        
        // Find top face (highest z) that's roughly parallel to bottom
        const bottomNormal = faceData[0].normal;
        let topFace = faceData[faceData.length - 1].index;
        
        // Check if there's a better parallel face
        for (let i = faceData.length - 1; i >= 0; i--) {
            const dot = Math.abs(
                bottomNormal.x * faceData[i].normal.x +
                bottomNormal.y * faceData[i].normal.y +
                bottomNormal.z * faceData[i].normal.z
            );
            // If normals are roughly parallel (dot product close to 1)
            if (dot > 0.7) {
                topFace = faceData[i].index;
                break;
            }
        }
        
        return { topFace, bottomFace };
    }
    
    /**
     * Compute face area
     */
    computeFaceArea(face) {
        const v1 = {
            x: face[1].x - face[0].x,
            y: face[1].y - face[0].y,
            z: face[1].z - face[0].z
        };
        const v2 = {
            x: face[2].x - face[0].x,
            y: face[2].y - face[0].y,
            z: face[2].z - face[0].z
        };
        
        const cross = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
        
        return 0.5 * Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2);
    }
    
    /**
     * Build belt/strip of faces around the middle (excluding top/bottom)
     */
    buildBelt(faces, adjacency, topFace, bottomFace) {
        const belt = [];
        const visited = new Set([topFace, bottomFace]);
        const excluded = new Set([topFace, bottomFace]);
        
        // Start from a face adjacent to bottom (or top)
        let startFace = null;
        if (adjacency[bottomFace] && adjacency[bottomFace].length > 0) {
            startFace = adjacency[bottomFace][0].faceIndex;
        } else if (adjacency[topFace] && adjacency[topFace].length > 0) {
            startFace = adjacency[topFace][0].faceIndex;
        }
        
        if (startFace === null) {
            // Fallback: find any face not top/bottom
            for (let i = 0; i < faces.length; i++) {
                if (i !== topFace && i !== bottomFace) {
                    startFace = i;
                    break;
                }
            }
        }
        
        if (startFace === null) return belt;
        
        // Build path around the middle
        const queue = [startFace];
        visited.add(startFace);
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // Add to belt if not top/bottom
            if (!excluded.has(current)) {
                belt.push(current);
            }
            
            // Add unvisited neighbors (but not top/bottom)
            if (adjacency[current]) {
                const neighbors = adjacency[current]
                    .map(n => n.faceIndex)
                    .filter(idx => !visited.has(idx) && !excluded.has(idx));
                
                // Prefer neighbors that continue the belt (not going back toward top/bottom)
                neighbors.sort((a, b) => {
                    const aAdj = adjacency[a] || [];
                    const bAdj = adjacency[b] || [];
                    const aAdjTop = aAdj.some(n => n.faceIndex === topFace) ? 1 : 0;
                    const bAdjTop = bAdj.some(n => n.faceIndex === topFace) ? 1 : 0;
                    const aAdjBottom = aAdj.some(n => n.faceIndex === bottomFace) ? 1 : 0;
                    const bAdjBottom = bAdj.some(n => n.faceIndex === bottomFace) ? 1 : 0;
                    
                    // Prefer faces that don't connect to top/bottom (middle belt faces)
                    return (aAdjTop + aAdjBottom) - (bAdjTop + bAdjBottom);
                });
                
                for (const neighborIdx of neighbors) {
                    visited.add(neighborIdx);
                    queue.push(neighborIdx);
                }
            }
        }
        
        // If belt is too short, add remaining faces
        if (belt.length < faces.length - 2) {
            for (let i = 0; i < faces.length; i++) {
                if (!excluded.has(i) && !belt.includes(i)) {
                    belt.push(i);
                }
            }
        }
        
        return belt;
    }
    
    /**
     * Create strip layout: belt in middle, top on one side, bottom on other
     */
    createStripLayout(faces, belt, topFace, bottomFace, adjacency, faceGroups) {
        const net = [];
        const visited = new Set();
        const occupiedSpace = [];
        
        // Place belt faces in a strip (horizontal line)
        let currentX = 0;
        const stripY = 0;
        let lastFaceIdx = null;
        
        // Place first belt face
        if (belt.length > 0) {
            const firstBeltFace = belt[0];
            const vertices2D = this.project3DTriangleTo2D(faces[firstBeltFace], currentX, stripY, 0);
            
            net.push({
                face: faces[firstBeltFace],
                vertices2D: vertices2D,
                groupIndex: this.getFaceGroupIndex(firstBeltFace, faceGroups),
                faceIndex: firstBeltFace,
                connectedTo: null
            });
            occupiedSpace.push({ vertices: vertices2D, index: firstBeltFace });
            visited.add(firstBeltFace);
            lastFaceIdx = firstBeltFace;
            
            // Calculate width of first face for spacing
            const bbox = this.getBoundingBox(vertices2D);
            currentX = bbox.maxX;
        }
        
        // Place remaining belt faces in sequence
        for (let i = 1; i < belt.length; i++) {
            const beltFaceIdx = belt[i];
            if (visited.has(beltFaceIdx)) continue;
            
            // Find shared edge with previous face
            let sharedEdge = null;
            if (lastFaceIdx !== null && adjacency[beltFaceIdx]) {
                sharedEdge = adjacency[beltFaceIdx].find(n => n.faceIndex === lastFaceIdx);
            }
            
            // If no shared edge with previous, find any adjacent belt face
            if (!sharedEdge && adjacency[beltFaceIdx]) {
                for (const adj of adjacency[beltFaceIdx]) {
                    if (visited.has(adj.faceIndex) && belt.includes(adj.faceIndex)) {
                        sharedEdge = adj;
                        lastFaceIdx = adj.faceIndex;
                        break;
                    }
                }
            }
            
            const lastNet = net.find(n => n.faceIndex === lastFaceIdx);
            let vertices2D;
            
            if (sharedEdge && lastNet && sharedEdge.sharedEdge) {
                // Try both orientations and check for overlaps
                let bestVertices2D = null;
                let minOverlap = Infinity;
                
                for (let flip = 0; flip < 2; flip++) {
                    const testVertices2D = this.placeFaceAlongSharedEdge(
                        faces[beltFaceIdx],
                        lastNet.vertices2D,
                        sharedEdge.sharedEdge.neighborIndices,
                        sharedEdge.sharedEdge.currentIndices,
                        flip
                    );
                    
                    // Check overlap with all existing faces
                    const overlapScore = this.calculateOverlapScore(testVertices2D, occupiedSpace, lastFaceIdx);
                    
                    if (overlapScore < minOverlap) {
                        minOverlap = overlapScore;
                        bestVertices2D = testVertices2D;
                    }
                    
                    // If no overlap, use this
                    if (overlapScore === 0) break;
                }
                
                vertices2D = bestVertices2D;
                
                if (minOverlap > 0) {
                    console.warn(`Face ${beltFaceIdx} has overlap score: ${minOverlap.toFixed(3)} - flipped to minimize`);
                }
            } else {
                // Place at offset
                const bbox = this.getBoundingBox(lastNet.vertices2D);
                vertices2D = this.project3DTriangleTo2D(faces[beltFaceIdx], currentX, stripY, 0);
            }
            
            net.push({
                face: faces[beltFaceIdx],
                vertices2D: vertices2D,
                groupIndex: this.getFaceGroupIndex(beltFaceIdx, faceGroups),
                faceIndex: beltFaceIdx,
                connectedTo: lastFaceIdx
            });
            occupiedSpace.push({ vertices: vertices2D, index: beltFaceIdx });
            visited.add(beltFaceIdx);
            
            const bbox = this.getBoundingBox(vertices2D);
            currentX = bbox.maxX;
            lastFaceIdx = beltFaceIdx;
        }
        
        // Place top face above the belt (try both sides)
        if (!visited.has(topFace)) {
            const topConnection = this.findBeltConnection(topFace, belt, adjacency, net);
            if (topConnection) {
                // Try both orientations and choose the one with less overlap
                let bestTopVertices2D = null;
                let minOverlap = Infinity;
                
                for (let flip = 0; flip < 2; flip++) {
                    const testVertices2D = this.placeFaceAlongSharedEdge(
                        faces[topFace],
                        topConnection.vertices2D,
                        topConnection.sharedEdge.neighborIndices,
                        topConnection.sharedEdge.currentIndices,
                        flip
                    );
                    
                    const overlapScore = this.calculateOverlapScore(testVertices2D, occupiedSpace, topConnection.faceIndex);
                    
                    if (overlapScore < minOverlap) {
                        minOverlap = overlapScore;
                        bestTopVertices2D = testVertices2D;
                    }
                    
                    if (overlapScore === 0) break;
                }
                
                if (minOverlap > 0) {
                    console.warn(`Top face ${topFace} overlap: ${minOverlap.toFixed(3)} - flipped to outside`);
                }
                
                net.push({
                    face: faces[topFace],
                    vertices2D: bestTopVertices2D,
                    groupIndex: this.getFaceGroupIndex(topFace, faceGroups),
                    faceIndex: topFace,
                    connectedTo: topConnection.faceIndex
                });
                occupiedSpace.push({ vertices: bestTopVertices2D, index: topFace });
                visited.add(topFace);
            }
        }
        
        // Place bottom face below the belt (try both sides)
        if (!visited.has(bottomFace)) {
            const bottomConnection = this.findBeltConnection(bottomFace, belt, adjacency, net);
            if (bottomConnection) {
                // Try both orientations and choose the one with less overlap
                let bestBottomVertices2D = null;
                let minOverlap = Infinity;
                
                for (let flip = 0; flip < 2; flip++) {
                    const testVertices2D = this.placeFaceAlongSharedEdge(
                        faces[bottomFace],
                        bottomConnection.vertices2D,
                        bottomConnection.sharedEdge.neighborIndices,
                        bottomConnection.sharedEdge.currentIndices,
                        flip
                    );
                    
                    const overlapScore = this.calculateOverlapScore(testVertices2D, occupiedSpace, bottomConnection.faceIndex);
                    
                    if (overlapScore < minOverlap) {
                        minOverlap = overlapScore;
                        bestBottomVertices2D = testVertices2D;
                    }
                    
                    if (overlapScore === 0) break;
                }
                
                if (minOverlap > 0) {
                    console.warn(`Bottom face ${bottomFace} overlap: ${minOverlap.toFixed(3)} - flipped to outside`);
                }
                
                net.push({
                    face: faces[bottomFace],
                    vertices2D: bestBottomVertices2D,
                    groupIndex: this.getFaceGroupIndex(bottomFace, faceGroups),
                    faceIndex: bottomFace,
                    connectedTo: bottomConnection.faceIndex
                });
                occupiedSpace.push({ vertices: bestBottomVertices2D, index: bottomFace });
                visited.add(bottomFace);
            }
        }
        
        // Add any remaining faces (with overlap detection)
        for (let i = 0; i < faces.length; i++) {
            if (!visited.has(i)) {
                // Find best connection
                const connection = this.findBeltConnection(i, belt, adjacency, net);
                if (connection) {
                    // Try both orientations
                    let bestVertices2D = null;
                    let minOverlap = Infinity;
                    
                    for (let flip = 0; flip < 2; flip++) {
                        const testVertices2D = this.placeFaceAlongSharedEdge(
                            faces[i],
                            connection.vertices2D,
                            connection.sharedEdge.neighborIndices,
                            connection.sharedEdge.currentIndices,
                            flip
                        );
                        
                        const overlapScore = this.calculateOverlapScore(testVertices2D, occupiedSpace, connection.faceIndex);
                        
                        if (overlapScore < minOverlap) {
                            minOverlap = overlapScore;
                            bestVertices2D = testVertices2D;
                        }
                        
                        if (overlapScore === 0) break;
                    }
                    
                    if (minOverlap > 0) {
                        console.warn(`Remaining face ${i} overlap: ${minOverlap.toFixed(3)} - flipped to outside`);
                    }
                    
                    net.push({
                        face: faces[i],
                        vertices2D: bestVertices2D,
                        groupIndex: this.getFaceGroupIndex(i, faceGroups),
                        faceIndex: i,
                        connectedTo: connection.faceIndex
                    });
                    occupiedSpace.push({ vertices: bestVertices2D, index: i });
                    visited.add(i);
                }
            }
        }
        
        return net;
    }
    
    /**
     * Find best connection point in belt for a face
     */
    findBeltConnection(faceIdx, belt, adjacency, net) {
        if (!adjacency[faceIdx]) return null;
        
        // Find first adjacent face that's already in the net
        for (const adj of adjacency[faceIdx]) {
            const existing = net.find(n => n.faceIndex === adj.faceIndex);
            if (existing) {
                return {
                    faceIndex: adj.faceIndex,
                    vertices2D: existing.vertices2D,
                    sharedEdge: adj.sharedEdge  // Extract the actual sharedEdge object
                };
            }
        }
        
        return null;
    }
    
    /**
     * Analyze symmetry groups - faces with identical geometry
     */
    analyzeSymmetryGroups(faces, faceGroups) {
        const groups = {};
        faceGroups.forEach((group, idx) => {
            groups[idx] = {
                faces: group.indices,
                count: group.indices.length,
                color: group.color
            };
        });
        return groups;
    }
    
    /**
     * Create spanning tree that respects symmetry
     * @param {number} startFace - Index of face to start from (random if not provided)
     */
    createSymmetricSpanningTree(numFaces, adjacency, symmetryGroups, startFace = null) {
        const tree = {};
        
        // Choose random starting face if not specified
        if (startFace === null || startFace === undefined) {
            startFace = this.generateVariation ? Math.floor(Math.random() * numFaces) : 0;
        }
        
        const visited = new Set([startFace]);
        const queue = [startFace];
        
        for (let i = 0; i < numFaces; i++) {
            tree[i] = [];
        }
        
        // BFS but shuffle neighbors for variation
        while (queue.length > 0 && visited.size < numFaces) {
            const current = queue.shift();
            const neighbors = [...(adjacency[current] || [])];
            
            // Shuffle neighbors if generating variation for different layouts
            if (this.generateVariation) {
                this.shuffleArray(neighbors);
            } else {
                // Sort neighbors by symmetry group preference
                neighbors.sort((a, b) => {
                    const aVisited = visited.has(a.faceIndex) ? 1 : 0;
                    const bVisited = visited.has(b.faceIndex) ? 1 : 0;
                    return aVisited - bVisited;
                });
            }
            
            for (const neighborInfo of neighbors) {
                const neighborIdx = neighborInfo.faceIndex;
                
                if (visited.has(neighborIdx)) continue;
                
                tree[current].push(neighborInfo);
                visited.add(neighborIdx);
                queue.push(neighborIdx);
            }
        }
        
        return { tree, startFace };
    }
    
    /**
     * Shuffle array in place (Fisher-Yates)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Create radial layout with overlap avoidance
     * @param {number} startFace - Index of face to start from
     */
    createRadialLayout(faces, spanningTree, faceGroups, startFace = 0) {
        const net = [];
        const visited = new Set([startFace]);
        const occupiedSpace = []; // Track placed triangles for overlap detection
        
        // Start with specified face at origin
        const startX = 0;
        const startY = 0;
        const vertices2D = this.project3DTriangleTo2D(faces[startFace], startX, startY, 0);
        
        net.push({
            face: faces[startFace],
            vertices2D: vertices2D,
            groupIndex: this.getFaceGroupIndex(startFace, faceGroups),
            faceIndex: startFace,
            connectedTo: null
        });
        occupiedSpace.push({ vertices: vertices2D, index: startFace });
        
        // Process faces level by level
        const toProcess = [{ faceIdx: startFace, level: 0 }];
        
        while (toProcess.length > 0 && visited.size < faces.length) {
            const { faceIdx: currentFaceIdx, level } = toProcess.shift();
            const currentNet = net.find(n => n.faceIndex === currentFaceIdx);
            
            if (!currentNet) continue;
            
            const children = spanningTree[currentFaceIdx] || [];
            
            // Try multiple orientations for each child to avoid overlaps
            for (const childInfo of children) {
                const childIdx = childInfo.faceIndex;
                
                if (visited.has(childIdx)) continue;
                
                const sharedEdge = childInfo.sharedEdge;
                
                // Try both flip orientations
                let bestPlacement = null;
                let minOverlap = Infinity;
                
                for (let flip = 0; flip < 2; flip++) {
                    const newVertices2D = this.placeFaceAlongSharedEdge(
                        faces[childIdx],
                        currentNet.vertices2D,
                        sharedEdge.currentIndices,
                        sharedEdge.neighborIndices,
                        flip
                    );
                    
                    // Calculate overlap score
                    const overlapScore = this.calculateOverlapScore(newVertices2D, occupiedSpace, currentFaceIdx);
                    
                    if (overlapScore < minOverlap) {
                        minOverlap = overlapScore;
                        bestPlacement = newVertices2D;
                    }
                    
                    // If no overlap, use this immediately
                    if (overlapScore === 0) break;
                }
                
                if (minOverlap > 0) {
                    console.warn(`Face ${childIdx} has overlap score: ${minOverlap.toFixed(3)}`);
                }
                
                net.push({
                    face: faces[childIdx],
                    vertices2D: bestPlacement,
                    groupIndex: this.getFaceGroupIndex(childIdx, faceGroups),
                    faceIndex: childIdx,
                    connectedTo: currentFaceIdx
                });
                
                occupiedSpace.push({ vertices: bestPlacement, index: childIdx });
                visited.add(childIdx);
                toProcess.push({ faceIdx: childIdx, level: level + 1 });
            }
        }
        
        return net;
    }
    
    /**
     * Calculate overlap score between a new face and existing faces
     * Returns 0 if no overlap, higher values for more overlap
     */
    calculateOverlapScore(newVertices, occupiedSpace, skipIndex = -1) {
        let totalOverlap = 0;
        const epsilon = 0.05; // Minimum separation distance
        
        for (const existing of occupiedSpace) {
            // Skip the face we're connected to (they share an edge)
            if (existing.index === skipIndex) continue;
            
            // Check if triangles overlap
            const overlap = this.trianglesOverlap(newVertices, existing.vertices, epsilon);
            if (overlap) {
                totalOverlap += this.calculateOverlapArea(newVertices, existing.vertices);
            }
        }
        
        return totalOverlap;
    }
    
    /**
     * Check if two triangles overlap (including small buffer)
     */
    trianglesOverlap(tri1, tri2, buffer = 0.05) {
        // Quick bounding box check first
        const box1 = this.getBoundingBox(tri1);
        const box2 = this.getBoundingBox(tri2);
        
        if (!this.boxesOverlap(box1, box2, buffer)) {
            return false;
        }
        
        // Check if any vertex of one triangle is inside the other
        for (const v of tri1) {
            if (this.pointInTriangle(v, tri2)) return true;
        }
        for (const v of tri2) {
            if (this.pointInTriangle(v, tri1)) return true;
        }
        
        // Check if edges intersect
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.edgesIntersect(
                    tri1[i], tri1[(i + 1) % 3],
                    tri2[j], tri2[(j + 1) % 3]
                )) return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate approximate overlap area
     */
    calculateOverlapArea(tri1, tri2) {
        // Simplified: use minimum distance between centroids
        const c1 = this.getCentroid(tri1);
        const c2 = this.getCentroid(tri2);
        const dist = Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
        
        // Return inverse distance as overlap score
        return Math.max(0, 2.0 - dist);
    }
    
    /**
     * Get bounding box of triangle
     */
    getBoundingBox(tri) {
        return {
            minX: Math.min(tri[0].x, tri[1].x, tri[2].x),
            maxX: Math.max(tri[0].x, tri[1].x, tri[2].x),
            minY: Math.min(tri[0].y, tri[1].y, tri[2].y),
            maxY: Math.max(tri[0].y, tri[1].y, tri[2].y)
        };
    }
    
    /**
     * Check if bounding boxes overlap
     */
    boxesOverlap(box1, box2, buffer = 0) {
        return !(box1.maxX + buffer < box2.minX || 
                box2.maxX + buffer < box1.minX ||
                box1.maxY + buffer < box2.minY || 
                box2.maxY + buffer < box1.minY);
    }
    
    /**
     * Check if point is inside triangle
     */
    pointInTriangle(p, tri) {
        const sign = (p1, p2, p3) => {
            return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
        };
        
        const d1 = sign(p, tri[0], tri[1]);
        const d2 = sign(p, tri[1], tri[2]);
        const d3 = sign(p, tri[2], tri[0]);
        
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        
        return !(hasNeg && hasPos);
    }
    
    /**
     * Check if two line segments intersect
     */
    edgesIntersect(a1, a2, b1, b2) {
        const ccw = (A, B, C) => {
            return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
        };
        
        return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2);
    }
    
    /**
     * Get centroid of triangle
     */
    getCentroid(tri) {
        return {
            x: (tri[0].x + tri[1].x + tri[2].x) / 3,
            y: (tri[0].y + tri[1].y + tri[2].y) / 3
        };
    }
    
    /**
     * Create spanning tree of face adjacency graph
     */
    createSpanningTree(numFaces, adjacency) {
        const tree = {};
        const visited = new Set([0]);
        const queue = [0];
        
        for (let i = 0; i < numFaces; i++) {
            tree[i] = [];
        }
        
        // BFS to build spanning tree
        while (queue.length > 0 && visited.size < numFaces) {
            const current = queue.shift();
            const neighbors = adjacency[current] || [];
            
            for (const neighborInfo of neighbors) {
                const neighborIdx = neighborInfo.faceIndex;
                
                if (visited.has(neighborIdx)) continue;
                
                // Add edge to spanning tree
                tree[current].push(neighborInfo);
                
                visited.add(neighborIdx);
                queue.push(neighborIdx);
            }
        }
        
        return tree;
    }
    
    /**
     * Build adjacency graph of faces
     */
    buildFaceAdjacency(faces) {
        const adjacency = {};
        
        for (let i = 0; i < faces.length; i++) {
            adjacency[i] = [];
            
            for (let j = 0; j < faces.length; j++) {
                if (i === j) continue;
                
                const sharedEdge = this.findSharedEdge3D(faces[i], faces[j]);
                
                if (sharedEdge) {
                    adjacency[i].push({
                        faceIndex: j,
                        sharedEdge: sharedEdge
                    });
                }
            }
        }
        
        return adjacency;
    }
    
    /**
     * Find shared edge between two 3D faces
     */
    findSharedEdge3D(face1, face2) {
        // Check all pairs of vertices
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const i_next = (i + 1) % 3;
                const j_prev = (j + 2) % 3; // Previous vertex in reverse order
                
                // Check if edge (i, i+1) in face1 matches edge (j, j-1) in face2 (reversed)
                if (this.pointsEqual(face1[i], face2[j]) && 
                    this.pointsEqual(face1[i_next], face2[j_prev])) {
                    return {
                        currentIndices: [i, i_next],
                        neighborIndices: [j, j_prev]
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Place a face along a shared edge with an already-placed face
     */
    placeFaceAlongSharedEdge(newFace3D, placedVertices2D, placedEdgeIndices, newEdgeIndices, flipSide = 0) {
        // Safety checks
        if (!placedVertices2D || !placedEdgeIndices || !newEdgeIndices) {
            console.error('Invalid parameters:', { placedVertices2D, placedEdgeIndices, newEdgeIndices });
            return this.project3DTriangleTo2D(newFace3D, 0, 0, 0);
        }
        
        if (placedEdgeIndices[0] === undefined || placedEdgeIndices[1] === undefined) {
            console.error('Invalid placedEdgeIndices:', placedEdgeIndices);
            return this.project3DTriangleTo2D(newFace3D, 0, 0, 0);
        }
        
        // The shared edge in 2D (from the already-placed face)
        const edge2D_p1 = placedVertices2D[placedEdgeIndices[0]];
        const edge2D_p2 = placedVertices2D[placedEdgeIndices[1]];
        
        // Find the third vertex of the new face (not on shared edge)
        let thirdVertexIdx = null;
        for (let i = 0; i < 3; i++) {
            if (i !== newEdgeIndices[0] && i !== newEdgeIndices[1]) {
                thirdVertexIdx = i;
                break;
            }
        }
        
        if (thirdVertexIdx === null) return [edge2D_p1, edge2D_p2, edge2D_p1]; // Error fallback
        
        // Calculate distances from third vertex to edge vertices in 3D
        const dist_third_to_edge0 = this.distance3D(newFace3D[thirdVertexIdx], newFace3D[newEdgeIndices[0]]);
        const dist_third_to_edge1 = this.distance3D(newFace3D[thirdVertexIdx], newFace3D[newEdgeIndices[1]]);
        
        // Use trilateration to find the third point in 2D
        const thirdVertex2D = this.trilaterate(
            edge2D_p1, edge2D_p2,
            dist_third_to_edge0, dist_third_to_edge1,
            flipSide % 2 === 1 // Alternate sides on retries
        );
        
        // Build the complete 2D triangle
        const result = [null, null, null];
        result[newEdgeIndices[0]] = edge2D_p1;
        result[newEdgeIndices[1]] = edge2D_p2;
        result[thirdVertexIdx] = thirdVertex2D;
        
        return result;
    }
    
    /**
     * Trilateration: find point given two reference points and distances
     */
    trilaterate(p1, p2, dist1, dist2, flipSide = false) {
        // p1 and p2 are the two known points
        // dist1 is distance from result to p1
        // dist2 is distance from result to p2
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const edgeLen = Math.sqrt(dx * dx + dy * dy);
        
        if (edgeLen < 0.0001) return { x: p1.x, y: p1.y }; // Degenerate case
        
        // Normalize edge direction
        const ex = dx / edgeLen;
        const ey = dy / edgeLen;
        
        // Find x coordinate along edge
        const x = (dist1 * dist1 - dist2 * dist2 + edgeLen * edgeLen) / (2 * edgeLen);
        
        // Find y coordinate (perpendicular to edge)
        const y_squared = dist1 * dist1 - x * x;
        const y = y_squared > 0 ? Math.sqrt(y_squared) : 0;
        
        // Perpendicular direction (can flip to other side of edge)
        const perpX = flipSide ? ey : -ey;
        const perpY = flipSide ? -ex : ex;
        
        return {
            x: p1.x + x * ex + y * perpX,
            y: p1.y + x * ey + y * perpY
        };
    }
    
    getFaceGroupIndex(faceIndex, faceGroups) {
        for (let i = 0; i < faceGroups.length; i++) {
            if (faceGroups[i].indices.includes(faceIndex)) {
                return i;
            }
        }
        return 0;
    }
    
    findSharedEdge(face1, face2) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.pointsEqual(face1[i], face2[j]) &&
                    this.pointsEqual(face1[(i+1)%3], face2[(j+2)%3])) {
                    return { face1: [i, (i+1)%3], face2: [j, (j+2)%3] };
                }
            }
        }
        return null;
    }
    
    pointsEqual(p1, p2) {
        return Math.abs(p1.x - p2.x) < 0.001 &&
               Math.abs(p1.y - p2.y) < 0.001 &&
               Math.abs(p1.z - p2.z) < 0.001;
    }
    
    project3DTriangleTo2D(face, offsetX, offsetY, rotation) {
        // Project 3D triangle to 2D preserving distances
        const p0 = face[0];
        const p1 = face[1];
        const p2 = face[2];
        
        // Calculate edge lengths in 3D
        const d01 = this.distance3D(p0, p1);
        const d12 = this.distance3D(p1, p2);
        const d20 = this.distance3D(p2, p0);
        
        // Place in 2D preserving distances
        // p0 at origin (plus offset)
        const v0 = { x: offsetX, y: offsetY };
        
        // p1 along x-axis
        const v1 = { x: offsetX + d01, y: offsetY };
        
        // p2 using triangle geometry
        const cosAngle = (d01*d01 + d20*d20 - d12*d12) / (2 * d01 * d20);
        const sinAngle = Math.sqrt(1 - cosAngle*cosAngle);
        const v2 = {
            x: offsetX + d20 * cosAngle,
            y: offsetY + d20 * sinAngle
        };
        
        return [v0, v1, v2];
    }
    
    distance3D(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    /**
     * Find shared vertices between two 2D faces (for fold line detection)
     */
    findSharedVertices2D(vertices1, vertices2) {
        const shared = [];
        const epsilon = 0.01;
        
        for (const v1 of vertices1) {
            for (const v2 of vertices2) {
                const dist = Math.sqrt((v1.x - v2.x)**2 + (v1.y - v2.y)**2);
                if (dist < epsilon) {
                    shared.push(v1);
                    break;
                }
            }
        }
        
        return shared;
    }
    
    placeFaceAdjacent(face, adjacentVertices, sharedEdge) {
        // Place new face sharing an edge with adjacent face
        const edge = [adjacentVertices[0], adjacentVertices[1]];
        const edgeLen = Math.sqrt(
            Math.pow(edge[1].x - edge[0].x, 2) +
            Math.pow(edge[1].y - edge[0].y, 2)
        );
        
        // Compute third vertex position
        const angle = Math.atan2(edge[1].y - edge[0].y, edge[1].x - edge[0].x);
        const midX = (edge[0].x + edge[1].x) / 2;
        const midY = (edge[0].y + edge[1].y) / 2;
        
        const perpAngle = angle + Math.PI / 2;
        const height = edgeLen * Math.sqrt(3) / 2; // Approximate as equilateral
        
        return [
            edge[0],
            edge[1],
            {
                x: midX + height * Math.cos(perpAngle),
                y: midY + height * Math.sin(perpAngle)
            }
        ];
    }
    
    /**
     * Draw the net on canvas with glue tabs
     */
    drawNet(net, faceGroups) {
        // Store the net for export
        this.currentNet = { net, faceGroups };
        
        // Clear canvas with white background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (net.length === 0) {
            this.ctx.fillStyle = '#666';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('No faces to display', 300, 400);
            return;
        }
        
        // Calculate bounds (including glue tabs if enabled)
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        net.forEach(face => {
            face.vertices2D.forEach(v => {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            });
        });
        
        // Add margin for glue tabs
        if (this.showGlueTabs) {
            const margin = this.glueTabWidth * 1.5;
            minX -= margin;
            maxX += margin;
            minY -= margin;
            maxY += margin;
        }
        
        // Calculate scale and offset to fit canvas with padding
        const width = maxX - minX;
        const height = maxY - minY;
        const padding = 40;
        const scale = Math.min(
            (this.canvas.width - 2 * padding) / width,
            (this.canvas.height - 2 * padding) / height
        );
        
        const offsetX = this.canvas.width / 2 - (minX + maxX) / 2 * scale;
        const offsetY = this.canvas.height / 2 - (minY + maxY) / 2 * scale;
        
        // Identify fold edges (shared between faces in the net)
        const foldEdges = this.identifyFoldEdges(net);
        
        // Draw glue tabs first (if enabled)
        if (this.showGlueTabs) {
            this.drawGlueTabs(net, foldEdges, scale, offsetX, offsetY);
        }
        
        // Draw fold lines (lighter, dashed)
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([5, 3]);
        
        foldEdges.forEach(edge => {
            this.ctx.beginPath();
            this.ctx.moveTo(edge[0].x * scale + offsetX, edge[0].y * scale + offsetY);
            this.ctx.lineTo(edge[1].x * scale + offsetX, edge[1].y * scale + offsetY);
            this.ctx.stroke();
        });
        
        this.ctx.setLineDash([]);
        
        // Draw faces
        net.forEach((netFace, i) => {
            const color = faceGroups[netFace.groupIndex].color;
            
            this.ctx.beginPath();
            netFace.vertices2D.forEach((v, j) => {
                const x = v.x * scale + offsetX;
                const y = v.y * scale + offsetY;
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            this.ctx.closePath();
            
            // Fill with pattern for better printability
            this.ctx.fillStyle = color + 'cc';
            this.ctx.fill();
            
            // Stroke (solid black for cut edges)
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw cell values from magic square (if enabled)
            if (this.showCellValues && netFace.face) {
                this.drawCellValues(netFace, scale, offsetX, offsetY);
            }
            
            // Label
            if (this.showLabels) {
                const centerX = netFace.vertices2D.reduce((sum, v) => sum + v.x, 0) / 3;
                const centerY = netFace.vertices2D.reduce((sum, v) => sum + v.y, 0) / 3;
                
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText(`F${i + 1}`, centerX * scale + offsetX, centerY * scale + offsetY - 15);
                this.ctx.fillText(`F${i + 1}`, centerX * scale + offsetX, centerY * scale + offsetY - 15);
            }
            
            // Edge lengths (small, for reference)
            if (this.showEdgeLengths) {
                for (let j = 0; j < 3; j++) {
                    const v1 = netFace.vertices2D[j];
                    const v2 = netFace.vertices2D[(j + 1) % 3];
                    
                    const edgeKey = this.edgeKey2D(v1, v2);
                    if (foldEdges.some(e => this.edgeKey2D(e[0], e[1]) === edgeKey)) {
                        continue; // Skip fold edges
                    }
                    
                    const midX = (v1.x + v2.x) / 2 * scale + offsetX;
                    const midY = (v1.y + v2.y) / 2 * scale + offsetY;
                    
                    // Calculate edge length in 3D
                    const p1 = netFace.face[j];
                    const p2 = netFace.face[(j + 1) % 3];
                    const len = this.distance3D(p1, p2);
                    
                    this.ctx.fillStyle = '#555';
                    this.ctx.font = '9px monospace';
                    this.ctx.fillText(len.toFixed(2), midX, midY);
                }
            }
        });
        
        // Instructions removed - they were covering the net
    }
    
    /**
     * Identify fold edges (shared edges in the net)
     */
    identifyFoldEdges(net) {
        const foldEdges = [];
        const epsilon = 0.01;
        
        for (let i = 0; i < net.length; i++) {
            if (net[i].connectedTo === null || net[i].connectedTo === undefined) continue;
            
            const connectedFace = net.find(n => n.faceIndex === net[i].connectedTo);
            if (!connectedFace) continue;
            
            const sharedVertices = this.findSharedVertices2D(net[i].vertices2D, connectedFace.vertices2D);
            if (sharedVertices.length === 2) {
                foldEdges.push(sharedVertices);
            }
        }
        
        return foldEdges;
    }
    
    /**
     * Draw glue tabs on cut edges
     */
    drawGlueTabs(net, foldEdges, scale, offsetX, offsetY) {
        const epsilon = 0.01;
        const tabWidth = this.glueTabWidth;
        
        net.forEach((netFace, faceIdx) => {
            const vertices = netFace.vertices2D;
            
            // Check each edge
            for (let i = 0; i < 3; i++) {
                const v1 = vertices[i];
                const v2 = vertices[(i + 1) % 3];
                
                // Check if this is a fold edge
                const isFoldEdge = foldEdges.some(edge => {
                    return (this.points2DEqual(v1, edge[0]) && this.points2DEqual(v2, edge[1])) ||
                           (this.points2DEqual(v1, edge[1]) && this.points2DEqual(v2, edge[0]));
                });
                
                if (isFoldEdge) continue; // Don't add tabs to fold edges
                
                // Add glue tab
                this.drawGlueTab(v1, v2, vertices[(i + 2) % 3], scale, offsetX, offsetY, faceIdx);
            }
        });
    }
    
    /**
     * Draw a single glue tab
     */
    drawGlueTab(v1, v2, v3, scale, offsetX, offsetY, faceIdx) {
        const tabWidth = this.glueTabWidth;
        
        // Calculate edge vector and perpendicular
        const edgeX = v2.x - v1.x;
        const edgeY = v2.y - v1.y;
        const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
        
        if (edgeLen < 0.001) return;
        
        // Normalize
        const ex = edgeX / edgeLen;
        const ey = edgeY / edgeLen;
        
        // Perpendicular (pointing away from face)
        let perpX = -ey;
        let perpY = ex;
        
        // Check if perpendicular points away from the face
        const centerX = (v1.x + v2.x + v3.x) / 3;
        const centerY = (v1.y + v2.y + v3.y) / 3;
        const midX = (v1.x + v2.x) / 2;
        const midY = (v1.y + v2.y) / 2;
        const toCenter = (centerX - midX) * perpX + (centerY - midY) * perpY;
        
        if (toCenter > 0) {
            perpX = -perpX;
            perpY = -perpY;
        }
        
        // Create trapezoid tab
        const inset = 0.15; // Inset from vertices
        const p1 = { x: v1.x + ex * inset, y: v1.y + ey * inset };
        const p2 = { x: v2.x - ex * inset, y: v2.y - ey * inset };
        const p3 = { 
            x: p2.x + perpX * tabWidth,
            y: p2.y + perpY * tabWidth
        };
        const p4 = { 
            x: p1.x + perpX * tabWidth,
            y: p1.y + perpY * tabWidth
        };
        
        // Draw tab
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x * scale + offsetX, p1.y * scale + offsetY);
        this.ctx.lineTo(p2.x * scale + offsetX, p2.y * scale + offsetY);
        this.ctx.lineTo(p3.x * scale + offsetX, p3.y * scale + offsetY);
        this.ctx.lineTo(p4.x * scale + offsetX, p4.y * scale + offsetY);
        this.ctx.closePath();
        
        // Fill with light gray pattern
        this.ctx.fillStyle = '#e8e8e8';
        this.ctx.fill();
        
        // Dashed border
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 2]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Add "GLUE" text on larger tabs
        if (edgeLen * scale > 40) {
            const tabCenterX = (p1.x + p2.x + p3.x + p4.x) / 4;
            const tabCenterY = (p1.y + p2.y + p3.y + p4.y) / 4;
            
            this.ctx.save();
            this.ctx.translate(tabCenterX * scale + offsetX, tabCenterY * scale + offsetY);
            this.ctx.rotate(Math.atan2(ey, ex));
            this.ctx.fillStyle = '#999';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('GLUE', 0, 0);
            this.ctx.restore();
        }
    }
    
    /**
     * Draw cell values from the magic square
     */
    drawCellValues(netFace, scale, offsetX, offsetY) {
        // Get the original magic square cell values for this face's vertices
        // This is a simplified version - in reality we'd need to map 3D points back to grid positions
        const centerX = netFace.vertices2D.reduce((sum, v) => sum + v.x, 0) / 3;
        const centerY = netFace.vertices2D.reduce((sum, v) => sum + v.y, 0) / 3;
        
        // Draw vertex values
        netFace.vertices2D.forEach((v, idx) => {
            if (netFace.face[idx].value !== undefined) {
                const x = v.x * scale + offsetX;
                const y = v.y * scale + offsetY;
                
                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 11px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // Draw with white halo for visibility
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText(netFace.face[idx].value, x, y);
                this.ctx.fillText(netFace.face[idx].value, x, y);
            }
        });
    }
    
    /**
     * Draw instructions overlay
     */
    drawInstructions() {
        const instructions = [
            '📋 PAPER CRAFT INSTRUCTIONS',
            '1. Print this template on card stock',
            '2. Cut along solid black lines',
            '3. Fold along dashed lines',
            '4. Apply glue to gray tabs',
            '5. Press tabs against matching edges'
        ];
        
        const x = 20;
        const y = 20;
        const lineHeight = 20;
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x - 10, y - 10, 340, instructions.length * lineHeight + 20, 5);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Instructions
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        instructions.forEach((line, i) => {
            if (i === 0) {
                this.ctx.font = 'bold 14px Arial';
            } else {
                this.ctx.font = '12px Arial';
            }
            this.ctx.fillText(line, x, y + i * lineHeight);
        });
    }
    
    /**
     * Helper: Check if two 2D points are equal
     */
    points2DEqual(p1, p2, epsilon = 0.01) {
        return Math.abs(p1.x - p2.x) < epsilon && Math.abs(p1.y - p2.y) < epsilon;
    }
    
    /**
     * Helper: Create edge key for 2D points
     */
    edgeKey2D(p1, p2) {
        const key1 = `${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
        const key2 = `${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
        return key1 < key2 ? `${key1}-${key2}` : `${key2}-${key1}`;
    }
    
    /**
     * Export the current net as a high-resolution image
     */
    exportAsImage(filename = 'magic-gem-papercraft.png', resolution = 2) {
        if (!this.currentNet) {
            console.error('No net to export');
            return;
        }
        
        // Create a high-resolution temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width * resolution;
        tempCanvas.height = this.canvas.height * resolution;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Save original canvas and context
        const originalCanvas = this.canvas;
        const originalCtx = this.ctx;
        
        // Temporarily use the high-res canvas
        this.canvas = tempCanvas;
        this.ctx = tempCtx;
        
        // Scale up drawing
        tempCtx.scale(resolution, resolution);
        
        // Redraw at high resolution
        this.drawNet(this.currentNet.net, this.currentNet.faceGroups);
        
        // Convert to blob and download
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
        
        // Restore original canvas
        this.canvas = originalCanvas;
        this.ctx = originalCtx;
    }
    
    /**
     * Print the current net
     */
    print() {
        if (!this.currentNet) {
            console.error('No net to print');
            return;
        }
        
        // Open print dialog with the canvas
        const dataUrl = this.canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Magic Gem Paper Craft</title>
                <style>
                    body {
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    @media print {
                        body {
                            margin: 0;
                        }
                        img {
                            max-width: 100%;
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <img src="${dataUrl}" alt="Magic Gem Paper Craft Template" />
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}

// Make available globally
window.PapercraftGenerator = PapercraftGenerator;

