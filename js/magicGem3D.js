/**
 * Magic Gem 3D Visualization with Proper Convex Hull
 * Uses Three.js ConvexGeometry for accurate hull rendering
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

class MagicGem3D {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        this.options = {
            showVertices: false,
            showEdges: false,
            showFaces: true,
            showVectors: false,
            showAxes: true,
            autoRotate: false,
            pointSize: 0.05,
            hullOpacity: 1.0,
            normalizeZ: false,
            ...options
        };
        
        this.scene = null;
        this.camera = null;
        this.perspectiveCamera = null;
        this.orthographicCamera = null;
        this.renderer = null;
        this.controls = null;
        this.gemGroup = null;
        this.axesGroup = null;
        this.animationId = null;
        this.currentHull = null;
        this.currentPoints = null;
        this.currentVectors = null;
        this.currentSquare = null;
        this.faceConnections = null;
        this.currentGroups = [];
        
        // Cache for face colors and connections
        this.squareColorCache = new Map();
        this.squareConnectionsCache = new Map();
        
        // Color palette for face groups
        this.colorPalette = [
            0x2f4f4f, 0x7f0000, 0x008000, 0x000080,
            0xff0000, 0x00ced1, 0xffa500, 0x7fff00,
            0x00fa9a, 0x0000ff, 0xff00ff, 0x1e90ff,
            0xeee8aa, 0xffff54, 0xdda0dd, 0xff1493
        ];
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e293b);
        
        // Create both camera types
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        
        this.perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.perspectiveCamera.position.set(3, 3, 3);
        
        this.orthographicCamera = new THREE.OrthographicCamera(
            -2 * aspect, 2 * aspect, 2, -2, 0.1, 1000
        );
        this.orthographicCamera.position.set(3, 3, 3);
        
        this.camera = this.perspectiveCamera; // Start with perspective
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = this.options.autoRotate;
        this.controls.autoRotateSpeed = 1.0;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        this.scene.add(ambientLight);
        
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
        frontLight.position.set(1, 1, 2);
        this.scene.add(frontLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(-1, -1, -2);
        this.scene.add(backLight);
        
        // Groups
        this.gemGroup = new THREE.Group();
        this.scene.add(this.gemGroup);
        
        this.axesGroup = new THREE.Group();
        this.scene.add(this.axesGroup);
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
        
        // Start animation
        this.animate();
        
        // Create axes
        if (this.options.showAxes) {
            this.createAxes();
        }
    }
    
    createAxes() {
        this.axesGroup.clear();
        
        const axesHelper = new THREE.AxesHelper(2);
        this.axesGroup.add(axesHelper);
    }
    
    updateSquare(square, epsilon = 0.001) {
        this.currentSquare = square;
        const coords = MagicSquares.toCoordinates(square, this.options.normalizeZ);
        return this.drawGem(coords, epsilon);
    }
    
    /**
     * Get hull geometry data for external use (e.g., paper nets)
     */
    getHullData() {
        if (!this.currentHull) return null;
        
        const geometry = this.currentHull.geometry;
        const posArray = geometry.attributes.position.array;
        const faces = [];
        
        // Extract faces as triangles
        for (let i = 0; i < posArray.length; i += 9) {
            faces.push([
                { x: posArray[i], y: posArray[i+1], z: posArray[i+2] },
                { x: posArray[i+3], y: posArray[i+4], z: posArray[i+5] },
                { x: posArray[i+6], y: posArray[i+7], z: posArray[i+8] }
            ]);
        }
        
        return {
            faces: faces,
            groups: this.currentGroups,
            square: this.currentSquare
        };
    }
    
    drawGem(coords, epsilon = 0.001) {
        this.gemGroup.clear();
        
        if (this.faceConnections) {
            this.scene.remove(this.faceConnections);
            this.faceConnections = null;
        }
        
        const n = Math.sqrt(coords.length);
        
        // Create THREE.Vector3 points
        const points3D = coords.map(c => new THREE.Vector3(c.x, c.y, c.z));
        
        // Color scale for points
        const maxZ = Math.max(...coords.map(c => Math.abs(c.z)));
        const getColor = (z) => {
            const hue = (z / maxZ + 1) / 2; // Normalize to [0, 1]
            return new THREE.Color().setHSL(hue, 1, 0.5);
        };
        
        // Draw vertices/points
        if (this.options.showVertices) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            
            coords.forEach(coord => {
                positions.push(coord.x, coord.y, coord.z);
                const color = getColor(coord.z);
                colors.push(color.r, color.g, color.b);
            });
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            const pointsMaterial = new THREE.PointsMaterial({
                size: this.options.pointSize,
                vertexColors: true
            });
            
            this.currentPoints = new THREE.Points(geometry, pointsMaterial);
            this.gemGroup.add(this.currentPoints);
        }
        
        // Create convex hull using ConvexGeometry
        const hullGeometry = new ConvexGeometry(points3D);
        
        const hullMaterial = new THREE.MeshPhongMaterial({
            transparent: true,
            opacity: this.options.hullOpacity,
            side: THREE.DoubleSide,
            vertexColors: true,
            shininess: 100,
            flatShading: true
        });
        
        this.currentHull = new THREE.Mesh(hullGeometry, hullMaterial);
        
        // Compute stats before coloring
        const stats = this.computeHullStats(hullGeometry, points3D);
        
        // Color similar faces
        if (this.options.showFaces) {
            this.colorSimilarFaces(this.currentSquare, hullGeometry, epsilon);
            this.gemGroup.add(this.currentHull);
        }
        
        // Draw vectors from origin
        if (this.options.showVectors) {
            const vectorsGroup = new THREE.Group();
            coords.forEach((coord, index) => {
                const direction = new THREE.Vector3(coord.x, coord.y, coord.z).normalize();
                const length = new THREE.Vector3(coord.x, coord.y, coord.z).length();
                
                const arrowHelper = new THREE.ArrowHelper(
                    direction,
                    new THREE.Vector3(0, 0, 0),
                    length,
                    getColor(coord.z).getHex(),
                    0.1, 0.05
                );
                vectorsGroup.add(arrowHelper);
            });
            this.currentVectors = vectorsGroup;
            this.gemGroup.add(this.currentVectors);
        }
        
        return stats;
    }
    
    computeHullStats(geometry, points3D) {
        // Calculate volume
        let volume = 0;
        const posArray = geometry.attributes.position.array;
        
        for (let i = 0; i < posArray.length; i += 9) {
            const v1 = new THREE.Vector3(posArray[i], posArray[i+1], posArray[i+2]);
            const v2 = new THREE.Vector3(posArray[i+3], posArray[i+4], posArray[i+5]);
            const v3 = new THREE.Vector3(posArray[i+6], posArray[i+7], posArray[i+8]);
            
            volume += v1.dot(v2.clone().cross(v3)) / 6.0;
        }
        volume = Math.abs(volume);
        
        // Count unique vertices on hull
        const uniqueVertices = new Set();
        for (let i = 0; i < posArray.length; i += 3) {
            const key = `${posArray[i].toFixed(6)},${posArray[i+1].toFixed(6)},${posArray[i+2].toFixed(6)}`;
            uniqueVertices.add(key);
        }
        
        const numFaces = geometry.attributes.position.count / 3;
        const interiorPoints = points3D.length - uniqueVertices.size;
        
        const numPairedFaces = this.currentGroups.reduce((acc, group) => {
            return acc + (group.length > 1 ? group.length : 0);
        }, 0);
        
        return {
            volume: volume.toFixed(6),
            vertices: uniqueVertices.size,
            faces: numFaces,
            pairedFaces: numPairedFaces,
            interiorPoints: interiorPoints
        };
    }
    
    getFaceVertices(faceIndex, geometry) {
        const vertices = [];
        const posArray = geometry.attributes.position.array;
        
        for (let i = 0; i < 3; i++) {
            const idx = faceIndex * 3 + i;
            vertices.push(new THREE.Vector3(
                posArray[idx * 3],
                posArray[idx * 3 + 1],
                posArray[idx * 3 + 2]
            ));
        }
        return vertices;
    }
    
    getFaceCharacteristics(vertices) {
        // Calculate edge lengths
        const edges = [];
        for (let i = 0; i < 3; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % 3];
            edges.push(v1.distanceTo(v2));
        }
        edges.sort();
        
        // Calculate angles
        const angles = [];
        for (let i = 0; i < 3; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % 3];
            const v3 = vertices[(i + 2) % 3];
            const edge1 = new THREE.Vector3().subVectors(v2, v1);
            const edge2 = new THREE.Vector3().subVectors(v3, v1);
            const angle = edge1.angleTo(edge2);
            angles.push(angle);
        }
        angles.sort();
        
        return { edges, angles };
    }
    
    areFacesSimilar(face1Chars, face2Chars, epsilon) {
        // Compare edge lengths
        for (let i = 0; i < 3; i++) {
            if (Math.abs(face1Chars.edges[i] - face2Chars.edges[i]) > epsilon) {
                return false;
            }
        }
        
        // Compare angles
        for (let i = 0; i < 3; i++) {
            if (Math.abs(face1Chars.angles[i] - face2Chars.angles[i]) > epsilon) {
                return false;
            }
        }
        
        return true;
    }
    
    getFaceCenter(vertices) {
        const center = new THREE.Vector3();
        vertices.forEach(v => center.add(v));
        center.divideScalar(3);
        return center;
    }
    
    generateDistinctColors(n) {
        const colors = [];
        for (let i = 0; i < n; i++) {
            colors.push(new THREE.Color(this.colorPalette[i % this.colorPalette.length]));
        }
        return colors;
    }
    
    createArcBetweenPoints(start, end, color) {
        // Calculate direction from center to middle point
        const center = new THREE.Vector3(0, 0, 0);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const directionFromCenter = midPoint.clone().sub(center).normalize();
        
        // Calculate the radius
        const radius = Math.max(start.length(), end.length(), midPoint.length()) * 2.5;
        
        // Create a raised control point
        const controlPoint = directionFromCenter.multiplyScalar(radius);
        
        // Create quadratic bezier curve
        const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
        const points = curve.getPoints(100);
        
        // Create tube geometry
        const tubeGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            100, 0.02, 8, false
        );
        
        // Create material with glow effect
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        return new THREE.Mesh(tubeGeometry, material);
    }
    
    colorSimilarFaces(square, geometry, epsilon) {
        // Create a unique key for the square
        const squareKey = JSON.stringify(square);
        
        // Remove existing connections
        if (this.faceConnections) {
            this.scene.remove(this.faceConnections);
        }
        this.faceConnections = new THREE.Group();
        
        // If cached, use cached colors and connections
        if (this.squareColorCache.has(squareKey)) {
            const cachedColors = this.squareColorCache.get(squareKey);
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cachedColors), 3));
            
            if (this.squareConnectionsCache.has(squareKey)) {
                const cachedConnections = this.squareConnectionsCache.get(squareKey);
                cachedConnections.forEach(conn => {
                    this.faceConnections.add(conn.clone());
                });
                this.scene.add(this.faceConnections);
            }
            return;
        }
        
        // Calculate face characteristics
        const numFaces = geometry.attributes.position.count / 3;
        const faceCharacteristics = [];
        const faceCenters = [];
        
        for (let i = 0; i < numFaces; i++) {
            const vertices = this.getFaceVertices(i, geometry);
            faceCharacteristics.push(this.getFaceCharacteristics(vertices));
            faceCenters.push(this.getFaceCenter(vertices));
        }
        
        // Group similar faces
        this.currentGroups = [];
        const used = new Set();
        
        for (let i = 0; i < numFaces; i++) {
            if (used.has(i)) continue;
            
            const group = [i];
            used.add(i);
            
            for (let j = i + 1; j < numFaces; j++) {
                if (!used.has(j) && this.areFacesSimilar(faceCharacteristics[i], faceCharacteristics[j], epsilon)) {
                    group.push(j);
                    used.add(j);
                }
            }
            
            this.currentGroups.push(group);
        }
        
        // Generate distinct colors
        const distinctColors = this.generateDistinctColors(this.currentGroups.length);
        
        // Create colors array and connections
        const hullColors = new Float32Array(geometry.attributes.position.count * 3);
        const connections = [];
        
        this.currentGroups.forEach((group, groupIndex) => {
            const color = distinctColors[groupIndex];
            
            // Color the faces
            group.forEach(faceIndex => {
                for (let i = 0; i < 3; i++) {
                    const vertexIndex = faceIndex * 3 + i;
                    hullColors[vertexIndex * 3] = color.r;
                    hullColors[vertexIndex * 3 + 1] = color.g;
                    hullColors[vertexIndex * 3 + 2] = color.b;
                }
            });
            
            // Create connections between faces in the same group
            if (group.length > 1) {
                for (let i = 0; i < group.length - 1; i++) {
                    const start = faceCenters[group[i]];
                    const end = faceCenters[group[i + 1]];
                    const arc = this.createArcBetweenPoints(start, end, color);
                    this.faceConnections.add(arc);
                    connections.push(arc);
                }
            }
        });
        
        // Add connections to scene
        this.scene.add(this.faceConnections);
        
        // Cache colors and connections
        this.squareColorCache.set(squareKey, Array.from(hullColors));
        this.squareConnectionsCache.set(squareKey, connections);
        
        // Apply colors
        geometry.setAttribute('color', new THREE.BufferAttribute(hullColors, 3));
        this.currentHull.material.vertexColors = true;
        this.currentHull.material.needsUpdate = true;
    }
    
    recolorFaces(epsilon) {
        if (this.currentHull && this.currentSquare) {
            const squareKey = JSON.stringify(this.currentSquare);
            this.squareColorCache.delete(squareKey);
            this.squareConnectionsCache.delete(squareKey);
            this.colorSimilarFaces(this.currentSquare, this.currentHull.geometry, epsilon);
            return this.computeHullStats(this.currentHull.geometry, 
                MagicSquares.toCoordinates(this.currentSquare).map(c => new THREE.Vector3(c.x, c.y, c.z)));
        }
        return null;
    }
    
    setView(view) {
        switch (view) {
            case 'front':
                this.camera.position.set(0, 0, 3);
                break;
            case 'back':
                this.camera.position.set(0, 0, -3);
                break;
            case 'left':
                this.camera.position.set(-3, 0, 0);
                break;
            case 'right':
                this.camera.position.set(3, 0, 0);
                break;
            case 'top':
                this.camera.position.set(0, 3, 0);
                break;
            case 'bottom':
                this.camera.position.set(0, -3, 0);
                break;
        }
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    switchCamera(useOrthographic) {
        const position = new THREE.Vector3();
        const target = new THREE.Vector3();
        this.camera.getWorldPosition(position);
        this.controls.target.clone(target);
        
        this.camera = useOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        this.camera.position.copy(position);
        
        this.controls.dispose();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.copy(target);
        
        if (useOrthographic) {
            const distance = position.length();
            this.orthographicCamera.zoom = 1 / distance;
            this.orthographicCamera.updateProjectionMatrix();
        }
        
        this.controls.update();
    }
    
    setOption(key, value) {
        this.options[key] = value;
        
        if (key === 'showAxes') {
            this.axesGroup.visible = value;
        } else if (key === 'autoRotate') {
            this.controls.autoRotate = value;
        } else if (key === 'pointSize') {
            this.options.pointSize = value;
            if (this.currentPoints) {
                this.currentPoints.material.size = value;
            }
        } else if (key === 'hullOpacity') {
            this.options.hullOpacity = value;
            if (this.currentHull) {
                this.currentHull.material.opacity = value;
            }
        }
    }
    
    onResize() {
        if (!this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        
        this.orthographicCamera.left = -2 * aspect;
        this.orthographicCamera.right = 2 * aspect;
        this.orthographicCamera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Export for use as module
export default MagicGem3D;

// Also make available globally for non-module scripts
window.MagicGem3D = MagicGem3D;
