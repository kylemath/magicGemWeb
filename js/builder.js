/**
 * Interactive Paper Craft Builder
 * Drag, rotate, and snap triangles together with physics-based snapping
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class PaperCraftBuilder {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pieces = [];
        this.selectedPiece = null;
        this.hoveredPiece = null;
        this.snapDistance = 0.2;
        this.snapEnabled = true;
        this.showEdges = true;
        this.showLabels = true;
        this.connectedGroups = [];
        this.isDragging = false;
        this.isRotating = false;
        
        // Mouse state
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this.dragOffset = new THREE.Vector3();
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e293b);
        
        // Camera - use fallback dimensions if container not ready
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;
        const aspect = width / height;
        this.camera = new THREE.OrthographicCamera(
            -10 * aspect, 10 * aspect,
            10, -10,
            0.1, 1000
        );
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Controls (disabled for custom interaction)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false; // We'll handle dragging manually
        this.controls.enableRotate = false;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x475569, 0x334155);
        gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(gridHelper);
        
        // Event listeners
        this.setupEventListeners();
        
        // Animation loop
        this.animate();
    }
    
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });
        
        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Window resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    /**
     * Keyboard handler
     */
    onKeyDown(event) {
        // Only process if canvas is focused or a piece is selected
        if (!this.hoveredPiece && !this.selectedPiece) return;
        
        const piece = this.selectedPiece || this.hoveredPiece;
        
        switch (event.key.toLowerCase()) {
            case 'h':
                // Flip horizontally
                this.flipPieceHorizontal(piece);
                event.preventDefault();
                break;
            case 'v':
                // Flip vertically
                this.flipPieceVertical(piece);
                event.preventDefault();
                break;
            case 'u':
            case 'd':
                // Unpair/disconnect
                this.disconnectPiece(piece);
                event.preventDefault();
                break;
            case 'r':
                // Rotate 60 degrees
                this.rotatePiece(piece, Math.PI / 3);
                event.preventDefault();
                break;
        }
    }
    
    /**
     * Load triangle pieces from net data
     */
    loadPieces(netData, faceGroups) {
        // Store original data for reset
        this.originalNetData = { net: netData, faceGroups: faceGroups };
        
        // Clear existing pieces
        this.pieces.forEach(piece => this.scene.remove(piece.mesh));
        this.pieces = [];
        this.connectedGroups = [];
        
        // Create a piece for each triangle in the net
        netData.forEach((netFace, idx) => {
            const piece = this.createPiece(netFace, faceGroups);
            this.pieces.push(piece);
            this.scene.add(piece.mesh);
        });
        
        // Initialize connected groups (each piece starts alone)
        this.pieces.forEach((piece, idx) => {
            this.connectedGroups.push([idx]);
        });
        
        this.updateStats();
    }
    
    /**
     * Create a draggable triangle piece
     */
    createPiece(netFace, faceGroups) {
        const vertices2D = netFace.vertices2D;
        const groupIndex = netFace.groupIndex;
        const color = faceGroups[groupIndex].color;
        
        // Create triangle geometry from 2D vertices
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            vertices2D[0].x, vertices2D[0].y, 0,
            vertices2D[1].x, vertices2D[1].y, 0,
            vertices2D[2].x, vertices2D[2].y, 0
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        
        // Material
        const material = new THREE.MeshLambertMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Calculate edges
        const edges = [
            { start: new THREE.Vector3(vertices2D[0].x, vertices2D[0].y, 0), 
              end: new THREE.Vector3(vertices2D[1].x, vertices2D[1].y, 0) },
            { start: new THREE.Vector3(vertices2D[1].x, vertices2D[1].y, 0), 
              end: new THREE.Vector3(vertices2D[2].x, vertices2D[2].y, 0) },
            { start: new THREE.Vector3(vertices2D[2].x, vertices2D[2].y, 0), 
              end: new THREE.Vector3(vertices2D[0].x, vertices2D[0].y, 0) }
        ];
        
        // Calculate edge lengths for matching
        const edgeLengths = edges.map(edge => 
            edge.start.distanceTo(edge.end)
        );
        
        // Create edge visuals
        const edgeLines = this.createEdgeLines(edges, color);
        mesh.add(edgeLines);
        
        // Create label
        if (this.showLabels) {
            const label = this.createLabel(netFace.faceIndex);
            mesh.add(label);
        }
        
        return {
            mesh,
            edges,
            edgeLengths,
            originalVertices: vertices2D,
            faceIndex: netFace.faceIndex,
            groupIndex,
            color,
            connectedTo: [], // Indices of connected pieces
            edgeLines
        };
    }
    
    /**
     * Create edge line visuals
     */
    createEdgeLines(edges, color) {
        const group = new THREE.Group();
        
        edges.forEach(edge => {
            const geometry = new THREE.BufferGeometry().setFromPoints([edge.start, edge.end]);
            const material = new THREE.LineBasicMaterial({ 
                color: 0x000000, 
                linewidth: 2,
                transparent: true,
                opacity: 0.5
            });
            const line = new THREE.Line(geometry, material);
            line.userData.isEdge = true;
            group.add(line);
        });
        
        return group;
    }
    
    /**
     * Create face label
     */
    createLabel(faceIndex) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`F${faceIndex + 1}`, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.5, 0.5, 1);
        
        return sprite;
    }
    
    /**
     * Mouse down handler
     */
    onMouseDown(event) {
        if (event.button !== 0) return; // Only left click for dragging
        
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find intersected piece
        const meshes = this.pieces.map(p => p.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            this.selectedPiece = this.pieces.find(p => p.mesh === intersects[0].object);
            this.isDragging = true;
            
            // Calculate drag offset
            const intersectPoint = intersects[0].point;
            this.dragOffset.copy(intersectPoint).sub(this.selectedPiece.mesh.position);
            
            // Highlight selected piece
            this.selectedPiece.mesh.material.emissive = new THREE.Color(0x444444);
            
            // Check if shift is held for rotation mode
            this.isRotating = event.shiftKey;
        }
    }
    
    /**
     * Mouse move handler
     */
    onMouseMove(event) {
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.isDragging && this.selectedPiece) {
            if (this.isRotating) {
                // Rotate piece based on mouse movement
                const deltaX = event.movementX;
                this.rotatePiece(this.selectedPiece, deltaX * 0.01);
            } else {
                // Drag piece
                this.raycaster.ray.intersectPlane(this.dragPlane, this.selectedPiece.mesh.position);
                this.selectedPiece.mesh.position.sub(this.dragOffset);
                
                // Move connected pieces
                this.moveConnectedGroup(this.selectedPiece);
                
                // Check for potential snaps
                if (this.snapEnabled) {
                    this.checkSnapping(this.selectedPiece);
                }
            }
        } else {
            // Hover detection
            const meshes = this.pieces.map(p => p.mesh);
            const intersects = this.raycaster.intersectObjects(meshes);
            
            // Clear previous hover
            if (this.hoveredPiece) {
                this.hoveredPiece.mesh.material.emissive = new THREE.Color(0x000000);
                this.hoveredPiece = null;
            }
            
            if (intersects.length > 0) {
                this.hoveredPiece = this.pieces.find(p => p.mesh === intersects[0].object);
                if (this.hoveredPiece !== this.selectedPiece) {
                    this.hoveredPiece.mesh.material.emissive = new THREE.Color(0x222222);
                }
            }
        }
    }
    
    /**
     * Mouse up handler
     */
    onMouseUp(event) {
        if (this.selectedPiece) {
            // Final snap check
            if (this.snapEnabled && !this.isRotating) {
                this.performSnap(this.selectedPiece);
            }
            
            // Clear selection
            this.selectedPiece.mesh.material.emissive = new THREE.Color(0x000000);
            this.selectedPiece = null;
        }
        
        this.isDragging = false;
        this.isRotating = false;
    }
    
    /**
     * Right click handler - rotate piece 60 degrees
     */
    onRightClick(event) {
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const meshes = this.pieces.map(p => p.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            const piece = this.pieces.find(p => p.mesh === intersects[0].object);
            this.rotatePiece(piece, Math.PI / 3); // 60 degrees
        }
    }
    
    /**
     * Flip a piece horizontally (mirror across Y axis)
     */
    flipPieceHorizontal(piece) {
        if (!piece) return;
        
        // Disconnect from any connected pieces first
        this.disconnectPiece(piece);
        
        // Flip the mesh geometry
        const geometry = piece.mesh.geometry;
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = -positions[i]; // Flip X coordinate
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals(); // Recompute normals
        
        // Update edges to reflect the flip
        piece.edges.forEach(edge => {
            edge.start.x = -edge.start.x;
            edge.end.x = -edge.end.x;
        });
        
        // Update original vertices
        piece.originalVertices.forEach(v => {
            v.x = -v.x;
        });
    }
    
    /**
     * Flip a piece vertically (mirror across X axis)
     */
    flipPieceVertical(piece) {
        if (!piece) return;
        
        // Disconnect from any connected pieces first
        this.disconnectPiece(piece);
        
        // Flip the mesh geometry
        const geometry = piece.mesh.geometry;
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] = -positions[i + 1]; // Flip Y coordinate
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals(); // Recompute normals
        
        // Update edges to reflect the flip
        piece.edges.forEach(edge => {
            edge.start.y = -edge.start.y;
            edge.end.y = -edge.end.y;
        });
        
        // Update original vertices
        piece.originalVertices.forEach(v => {
            v.y = -v.y;
        });
    }
    
    /**
     * Disconnect a piece from all connected pieces
     */
    disconnectPiece(piece) {
        const pieceIdx = this.pieces.indexOf(piece);
        if (pieceIdx === -1) return;
        
        // Find connected pieces
        const connectedIndices = [...piece.connectedTo];
        
        // Remove this piece from connected pieces' lists
        connectedIndices.forEach(otherIdx => {
            const otherPiece = this.pieces[otherIdx];
            if (otherPiece) {
                otherPiece.connectedTo = otherPiece.connectedTo.filter(idx => idx !== pieceIdx);
            }
        });
        
        // Clear this piece's connections
        piece.connectedTo = [];
        
        // Rebuild connected groups
        this.rebuildConnectedGroups();
        
        this.updateStats();
    }
    
    /**
     * Rebuild connected groups from scratch
     */
    rebuildConnectedGroups() {
        const visited = new Set();
        this.connectedGroups = [];
        
        this.pieces.forEach((piece, idx) => {
            if (visited.has(idx)) return;
            
            // Start new group with BFS
            const group = [];
            const queue = [idx];
            
            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                
                visited.add(current);
                group.push(current);
                
                // Add connected pieces to queue
                const currentPiece = this.pieces[current];
                currentPiece.connectedTo.forEach(connectedIdx => {
                    if (!visited.has(connectedIdx)) {
                        queue.push(connectedIdx);
                    }
                });
            }
            
            this.connectedGroups.push(group);
        });
    }
    
    /**
     * Rotate a piece and its connected group
     */
    rotatePiece(piece, angle) {
        const groupIdx = this.findGroup(this.pieces.indexOf(piece));
        const group = this.connectedGroups[groupIdx];
        
        // Rotate around piece center
        const center = piece.mesh.position.clone();
        
        group.forEach(idx => {
            const p = this.pieces[idx];
            const offset = p.mesh.position.clone().sub(center);
            offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
            p.mesh.position.copy(center).add(offset);
            p.mesh.rotation.z += angle;
        });
    }
    
    /**
     * Check for potential snapping with nearby pieces
     */
    checkSnapping(piece) {
        let bestMatch = null;
        let bestDistance = this.snapDistance;
        
        const pieceIdx = this.pieces.indexOf(piece);
        const pieceGroup = this.findGroup(pieceIdx);
        
        // Get world-space edges of this piece
        const worldEdges = this.getWorldEdges(piece);
        
        // Check against all other pieces not in the same group
        this.pieces.forEach((otherPiece, otherIdx) => {
            if (pieceIdx === otherIdx) return;
            
            const otherGroup = this.findGroup(otherIdx);
            if (pieceGroup === otherGroup) return; // Already connected
            
            const otherWorldEdges = this.getWorldEdges(otherPiece);
            
            // Check each edge pair
            worldEdges.forEach((edge, edgeIdx) => {
                otherWorldEdges.forEach((otherEdge, otherEdgeIdx) => {
                    // Check if edges have similar lengths (compatible)
                    const lengthDiff = Math.abs(edge.length - otherEdge.length);
                    if (lengthDiff > 0.01) return;
                    
                    // Check if edges are close and aligned
                    const { distance, aligned } = this.edgeDistance(edge, otherEdge);
                    
                    if (distance < bestDistance && aligned) {
                        bestDistance = distance;
                        bestMatch = {
                            piece: otherPiece,
                            pieceEdgeIdx: edgeIdx,
                            otherEdgeIdx: otherEdgeIdx,
                            distance
                        };
                    }
                });
            });
        });
        
        // Highlight matching edges
        if (this.showEdges && bestMatch) {
            this.highlightEdges(piece, bestMatch.pieceEdgeIdx, bestMatch.piece, bestMatch.otherEdgeIdx);
        } else {
            this.clearEdgeHighlights();
        }
        
        return bestMatch;
    }
    
    /**
     * Perform snap connection
     */
    performSnap(piece) {
        const match = this.checkSnapping(piece);
        
        if (match) {
            // Snap piece to match edge
            this.snapToEdge(piece, match);
            
            // Merge connected groups
            const pieceIdx = this.pieces.indexOf(piece);
            const otherIdx = this.pieces.indexOf(match.piece);
            this.mergeGroups(pieceIdx, otherIdx);
            
            // Mark as connected
            piece.connectedTo.push(otherIdx);
            match.piece.connectedTo.push(pieceIdx);
            
            this.updateStats();
        }
    }
    
    /**
     * Snap piece edge to match edge
     */
    snapToEdge(piece, match) {
        const worldEdges = this.getWorldEdges(piece);
        const otherWorldEdges = this.getWorldEdges(match.piece);
        
        const edge = worldEdges[match.pieceEdgeIdx];
        const otherEdge = otherWorldEdges[match.otherEdgeIdx];
        
        // Calculate transform to align edges
        const edgeCenter = edge.start.clone().add(edge.end).multiplyScalar(0.5);
        const otherEdgeCenter = otherEdge.start.clone().add(otherEdge.end).multiplyScalar(0.5);
        
        // Translate to align centers
        const offset = otherEdgeCenter.clone().sub(edgeCenter);
        piece.mesh.position.add(offset);
        
        // TODO: Also rotate to perfectly align edges if needed
    }
    
    /**
     * Get world-space edges of a piece
     */
    getWorldEdges(piece) {
        return piece.edges.map(edge => {
            const worldStart = edge.start.clone().applyMatrix4(piece.mesh.matrixWorld);
            const worldEnd = edge.end.clone().applyMatrix4(piece.mesh.matrixWorld);
            return {
                start: worldStart,
                end: worldEnd,
                length: worldStart.distanceTo(worldEnd)
            };
        });
    }
    
    /**
     * Calculate distance and alignment between two edges
     */
    edgeDistance(edge1, edge2) {
        // Distance between edge centers
        const center1 = edge1.start.clone().add(edge1.end).multiplyScalar(0.5);
        const center2 = edge2.start.clone().add(edge2.end).multiplyScalar(0.5);
        const distance = center1.distanceTo(center2);
        
        // Check alignment (edges should be roughly parallel and opposite direction)
        const dir1 = edge1.end.clone().sub(edge1.start).normalize();
        const dir2 = edge2.end.clone().sub(edge2.start).normalize();
        const dot = Math.abs(dir1.dot(dir2));
        const aligned = dot > 0.9; // Nearly parallel
        
        return { distance, aligned };
    }
    
    /**
     * Highlight edges that can snap
     */
    highlightEdges(piece1, edge1Idx, piece2, edge2Idx) {
        this.clearEdgeHighlights();
        
        // Highlight edges in green
        const edgeLine1 = piece1.edgeLines.children[edge1Idx];
        const edgeLine2 = piece2.edgeLines.children[edge2Idx];
        
        if (edgeLine1 && edgeLine2) {
            edgeLine1.material.color.set(0x00ff00);
            edgeLine1.material.opacity = 1.0;
            edgeLine2.material.color.set(0x00ff00);
            edgeLine2.material.opacity = 1.0;
        }
    }
    
    /**
     * Clear edge highlights
     */
    clearEdgeHighlights() {
        this.pieces.forEach(piece => {
            piece.edgeLines.children.forEach(line => {
                line.material.color.set(0x000000);
                line.material.opacity = 0.5;
            });
        });
    }
    
    /**
     * Move all pieces in connected group
     */
    moveConnectedGroup(piece) {
        const pieceIdx = this.pieces.indexOf(piece);
        const groupIdx = this.findGroup(pieceIdx);
        const group = this.connectedGroups[groupIdx];
        
        // Only move if group has more than one piece
        if (group.length <= 1) return;
        
        // Calculate offset from last position
        // (This is simplified - in practice you'd track previous positions)
    }
    
    /**
     * Find which group a piece belongs to
     */
    findGroup(pieceIdx) {
        return this.connectedGroups.findIndex(group => group.includes(pieceIdx));
    }
    
    /**
     * Merge two groups when pieces connect
     */
    mergeGroups(idx1, idx2) {
        const group1Idx = this.findGroup(idx1);
        const group2Idx = this.findGroup(idx2);
        
        if (group1Idx === group2Idx) return; // Already in same group
        
        // Merge group2 into group1
        const group2 = this.connectedGroups[group2Idx];
        this.connectedGroups[group1Idx].push(...group2);
        this.connectedGroups.splice(group2Idx, 1);
    }
    
    /**
     * Reset all pieces to original positions
     */
    reset() {
        // Reload pieces from original net data to reset all transformations
        if (this.originalNetData) {
            this.loadPieces(this.originalNetData.net, this.originalNetData.faceGroups);
        } else {
            // Fallback: just reset positions and rotations
            this.pieces.forEach((piece, idx) => {
                piece.mesh.position.set(
                    piece.originalVertices[0].x,
                    piece.originalVertices[0].y,
                    0
                );
                piece.mesh.rotation.set(0, 0, 0);
                piece.mesh.scale.set(1, 1, 1);
                piece.connectedTo = [];
            });
            
            // Reset groups
            this.connectedGroups = this.pieces.map((_, idx) => [idx]);
            this.updateStats();
        }
    }
    
    /**
     * Auto-fold attempt (stub for future implementation)
     */
    autoFold() {
        console.log('Auto-fold not yet implemented');
        // TODO: Implement automatic folding algorithm
        // Could use A* or greedy approach to connect pieces
    }
    
    /**
     * Explode pieces outward
     */
    explode() {
        this.pieces.forEach(piece => {
            const direction = piece.mesh.position.clone().normalize();
            piece.mesh.position.add(direction.multiplyScalar(3));
        });
        
        // Reset connections
        this.pieces.forEach(piece => piece.connectedTo = []);
        this.connectedGroups = this.pieces.map((_, idx) => [idx]);
        this.updateStats();
    }
    
    /**
     * Update statistics display
     */
    updateStats() {
        document.getElementById('builder-stat-pieces').textContent = this.pieces.length;
        document.getElementById('builder-stat-groups').textContent = this.connectedGroups.length;
        
        // Count snapped edges
        let snappedEdges = 0;
        this.pieces.forEach(piece => {
            snappedEdges += piece.connectedTo.length;
        });
        document.getElementById('builder-stat-snapped').textContent = Math.floor(snappedEdges / 2);
    }
    
    /**
     * Update mouse position
     */
    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    /**
     * Handle window resize
     */
    onResize() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;
        const aspect = width / height;
        
        this.camera.left = -10 * aspect;
        this.camera.right = 10 * aspect;
        this.camera.top = 10;
        this.camera.bottom = -10;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

export default PaperCraftBuilder;

