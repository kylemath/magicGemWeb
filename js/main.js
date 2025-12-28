/**
 * Main Application Logic
 * Handles tab switching, initialization, and interactivity
 */

import MagicGem3D from './magicGem3D.js';
import PaperCraftBuilder from './builder.js';

// Global state
let currentSquare = null;
let mainGemViewer = null;
let exploreGemViewer = null;
let enumGemViewer = null;
let paperGemViewer = null;
let paper4x4GemViewer = null;
let papercraftGenerator = null;
let papercraft4x4Generator = null;
let paperCraftBuilder = null;
let selectedSwapCell = null;
let allMagicSquares4x4 = [];
let allMagicSquares3x3 = [];

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initVisualization();
    initEnergyTab();
    initExploreTab();
    loadEnumerationData();
    initPapercraftTab();
    initPapercraft4x4Tab();
    initBuilderTab();
    
    // Set initial square
    currentSquare = MagicSquares.copySquare(MagicSquares.loShu);
    updateVisualization();
});

// ============================================================================
// TAB NAVIGATION
// ============================================================================

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
            
            // Trigger resize for Three.js canvases
            window.dispatchEvent(new Event('resize'));
            
            // Initialize tab-specific content
            if (tabId === 'energy') {
                initEnergyPlots();
            } else if (tabId === 'enumeration') {
                initEnumerationTab();
            } else if (tabId === 'papercraft') {
                if (!papercraftGenerator) initPapercraftTab();
            } else if (tabId === 'papercraft4x4') {
                if (!papercraft4x4Generator) initPapercraft4x4Tab();
            } else if (tabId === 'builder') {
                loadBuilderContent();
            }
        });
    });
}

// ============================================================================
// 3D VISUALIZATION
// ============================================================================

function initVisualization() {
    const container = document.getElementById('gem-canvas');
    if (!container) return;
    
    // Initialize Three.js viewer
    mainGemViewer = new MagicGem3D('gem-canvas', {
        showVertices: true,
        showEdges: true,
        showFaces: true,
        showVectors: false,
        showAxes: true,
        normalizeZ: true,
        autoRotate: false
    });
    
    // Order buttons
    document.querySelectorAll('.order-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.order-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const n = parseInt(btn.dataset.n);
            switch (n) {
                case 3:
                    currentSquare = MagicSquares.siamese(3);
                    break;
                case 4:
                    currentSquare = MagicSquares.doublyEven(4);
                    break;
                case 5:
                    currentSquare = MagicSquares.siamese(5);
                    break;
            }
            updateVisualization();
        });
    });
    
    // Display options
    const checkboxes = {
        'showVertices': 'showVertices',
        'showEdges': 'showEdges',
        'showFaces': 'showFaces',
        'showVectors': 'showVectors',
        'showAxes': 'showAxes',
        'autoRotate': 'autoRotate',
        'normalizeZ': 'normalizeZ'
    };
    
    Object.entries(checkboxes).forEach(([id, option]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                mainGemViewer.setOption(option, checkbox.checked);
                if (option !== 'autoRotate' && option !== 'showAxes') {
                    updateVisualization();
                }
            });
        }
    });
}

function updateVisualization() {
    if (!mainGemViewer || !currentSquare) return;
    
    const stats = mainGemViewer.updateSquare(currentSquare);
    
    // Update stats display
    document.getElementById('stat-volume').textContent = stats.volume;
    document.getElementById('stat-vertices').textContent = stats.vertices;
    document.getElementById('stat-energy').textContent = 
        MagicSquares.computeEnergy(currentSquare).toFixed(6);
    
    // Update mini square display
    updateMiniSquareDisplay('current-square-display', currentSquare);
}

function updateMiniSquareDisplay(containerId, square) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const n = square.length;
    container.innerHTML = '';
    container.className = `mini-square n${n}`;
    container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    
    square.forEach(row => {
        row.forEach(val => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = val;
            container.appendChild(cell);
        });
    });
}

// ============================================================================
// ENUMERATION TAB (4x4 Gallery)
// ============================================================================

let enumerationInitialized = false;

async function loadEnumerationData() {
    try {
        const response = await fetch('/api/magic-squares-4x4');
        allMagicSquares4x4 = await response.json();
        console.log(`Loaded ${allMagicSquares4x4.length} 4x4 magic squares`);
    } catch (error) {
        console.error('Error loading 4x4 magic squares:', error);
        allMagicSquares4x4 = [MagicSquares.doublyEven(4)]; // Fallback
    }
}

function initEnumerationTab() {
    if (enumerationInitialized) return;
    
    const container = document.getElementById('enum-gem-canvas');
    if (!container) return;
    
    // Initialize viewer
    enumGemViewer = new MagicGem3D('enum-gem-canvas', {
        showVertices: false,
        showEdges: false,
        showFaces: true,
        showVectors: false,
        showAxes: true,
        normalizeZ: true,
        autoRotate: false,
        pointSize: 0.05,
        hullOpacity: 1.0
    });
    
    // Setup controls
    setupEnumerationControls();
    
    // Load square dropdown
    populateSquareDropdown();
    
    enumerationInitialized = true;
}

function setupEnumerationControls() {
    // Checkboxes
    const checkboxMap = {
        'enum-showPoints': 'showVertices',
        'enum-showHull': 'showFaces',
        'enum-showVectors': 'showVectors',
        'enum-showAxes': 'showAxes',
        'enum-normalizeZ': 'normalizeZ'
    };
    
    Object.entries(checkboxMap).forEach(([id, option]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (enumGemViewer) {
                    enumGemViewer.setOption(option, checkbox.checked);
                    if (enumGemViewer.currentSquare) {
                        const stats = enumGemViewer.updateSquare(enumGemViewer.currentSquare);
                        updateEnumStats(stats);
                    }
                }
            });
        }
    });
    
    // Point size slider
    const pointSizeSlider = document.getElementById('enum-pointSize');
    const pointSizeValue = document.getElementById('enum-pointSizeValue');
    if (pointSizeSlider && pointSizeValue) {
        pointSizeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pointSizeValue.textContent = value.toFixed(2);
            if (enumGemViewer) {
                enumGemViewer.setOption('pointSize', value);
            }
        });
    }
    
    // Hull opacity slider
    const hullOpacitySlider = document.getElementById('enum-hullOpacity');
    const hullOpacityValue = document.getElementById('enum-hullOpacityValue');
    if (hullOpacitySlider && hullOpacityValue) {
        hullOpacitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            hullOpacityValue.textContent = value.toFixed(1);
            if (enumGemViewer) {
                enumGemViewer.setOption('hullOpacity', value);
            }
        });
    }
    
    // Color faces button
    const colorFacesBtn = document.getElementById('enum-colorFaces');
    const epsilonInput = document.getElementById('enum-epsilon');
    if (colorFacesBtn && epsilonInput) {
        colorFacesBtn.addEventListener('click', () => {
            if (enumGemViewer && enumGemViewer.currentSquare) {
                const epsilon = parseFloat(epsilonInput.value);
                const stats = enumGemViewer.recolorFaces(epsilon);
                if (stats) {
                    updateEnumStats(stats);
                }
            }
        });
    }
    
    // View buttons
    document.querySelectorAll('.enumeration-main .view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (enumGemViewer) {
                enumGemViewer.setView(view);
            }
        });
    });
}

function populateSquareDropdown() {
    const selector = document.getElementById('square-selector');
    if (!selector || allMagicSquares4x4.length === 0) return;
    
    selector.innerHTML = '';
    
    // Create options for each square
    allMagicSquares4x4.forEach((square, index) => {
        const option = document.createElement('option');
        option.value = index;
        // Format: "Square 1: [1,2,15,16][12,14,3,5]..."
        const firstRow = square[0].join(',');
        option.textContent = `Square ${index + 1}: [${firstRow}]...`;
        selector.appendChild(option);
    });
    
    // Add change event listener
    selector.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        const square = allMagicSquares4x4[index];
        selectEnumSquare(square, index);
    });
    
    // Select first square
    if (allMagicSquares4x4.length > 0) {
        selectEnumSquare(allMagicSquares4x4[0], 0);
    }
}

function selectEnumSquare(square, index) {
    if (!enumGemViewer) return;
    
    const stats = enumGemViewer.updateSquare(square);
    updateEnumStats(stats);
    
    // Update square number
    const numDisplay = document.getElementById('enum-square-num');
    if (numDisplay) {
        numDisplay.textContent = index + 1;
    }
}

function updateEnumStats(stats) {
    const statMap = {
        'enum-stat-faces': stats.faces,
        'enum-stat-paired': stats.pairedFaces,
        'enum-stat-vertices': stats.vertices,
        'enum-stat-volume': stats.volume,
        'enum-stat-interior': stats.interiorPoints
    };
    
    Object.entries(statMap).forEach(([id, value]) => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.textContent = value;
        }
    });
}

// ============================================================================
// ENERGY TAB
// ============================================================================

let energyPlotsInitialized = false;

function initEnergyTab() {
    MagicPlots.initEnergyExplorer();
}

function initEnergyPlots() {
    if (energyPlotsInitialized) return;
    
    MagicPlots.plotEnergyHistogram('energy-histogram-3', 3);
    MagicPlots.plotPerturbation('perturbation-plot');
    MagicPlots.plotScaling('scaling-plot');
    
    energyPlotsInitialized = true;
}

// ============================================================================
// EXPLORE TAB
// ============================================================================

let exploreSquare = null;

function initExploreTab() {
    exploreSquare = MagicSquares.copySquare(MagicSquares.loShu);
    
    // Generate button
    document.getElementById('generate-square')?.addEventListener('click', generateNewSquare);
    
    // D4 button
    document.getElementById('apply-d4')?.addEventListener('click', () => {
        if (exploreSquare) {
            exploreSquare = MagicSquares.randomD4(exploreSquare);
            updateExploreDisplay();
        }
    });
    
    // Order select
    document.getElementById('explore-order')?.addEventListener('change', generateNewSquare);
    
    // Method select
    document.getElementById('explore-method')?.addEventListener('change', generateNewSquare);
    
    // Initialize display
    updateExploreDisplay();
    
    // Initialize mini 3D viewer with normalization enabled by default
    const miniCanvas = document.getElementById('explore-gem-canvas');
    if (miniCanvas) {
        exploreGemViewer = new MagicGem3D('explore-gem-canvas', {
            showVertices: true,
            showEdges: true,
            showFaces: true,
            showVectors: false,
            showAxes: false,
            autoRotate: true,
            normalizeZ: true  // Enable by default for compact display
        });
    }
}

function generateNewSquare() {
    const orderSelect = document.getElementById('explore-order');
    const methodSelect = document.getElementById('explore-method');
    
    const n = parseInt(orderSelect?.value || 3);
    const method = methodSelect?.value || 'siamese';
    
    try {
        switch (method) {
            case 'siamese':
                if (n % 2 === 0) {
                    alert('Siamese method requires odd n. Using doubly-even instead.');
                    exploreSquare = MagicSquares.doublyEven(n);
                } else {
                    exploreSquare = MagicSquares.siamese(n);
                }
                break;
            case 'doubly-even':
                if (n % 4 !== 0) {
                    alert('Doubly-even method requires n divisible by 4. Using Siamese instead.');
                    exploreSquare = MagicSquares.siamese(n);
                } else {
                    exploreSquare = MagicSquares.doublyEven(n);
                }
                break;
            case 'random':
                exploreSquare = MagicSquares.randomArrangement(n);
                break;
        }
    } catch (e) {
        exploreSquare = MagicSquares.randomArrangement(n);
    }
    
    selectedSwapCell = null;
    updateExploreDisplay();
}

function updateExploreDisplay() {
    if (!exploreSquare) return;
    
    const n = exploreSquare.length;
    
    // Update editable square
    const container = document.getElementById('editable-square');
    if (container) {
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        
        exploreSquare.forEach((row, i) => {
            row.forEach((val, j) => {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = val;
                
                if (selectedSwapCell && selectedSwapCell[0] === i && selectedSwapCell[1] === j) {
                    cell.classList.add('swap-source');
                }
                
                cell.addEventListener('click', () => handleCellClick(i, j));
                container.appendChild(cell);
            });
        });
    }
    
    // Update properties
    const isMagic = MagicSquares.isMagic(exploreSquare);
    const energy = MagicSquares.computeEnergy(exploreSquare);
    const covs = MagicSquares.computeCovariances(exploreSquare);
    const det = MagicSquares.determinant(exploreSquare);
    
    document.getElementById('prop-is-magic').textContent = isMagic ? '✓ Yes' : '✗ No';
    document.getElementById('prop-is-magic').className = 'prop-value ' + (isMagic ? 'success' : 'error');
    document.getElementById('prop-energy').textContent = energy.toFixed(6);
    document.getElementById('prop-cov-xz').textContent = covs.covXZ.toFixed(6);
    document.getElementById('prop-cov-yz').textContent = covs.covYZ.toFixed(6);
    document.getElementById('prop-det').textContent = det !== null ? det.toFixed(2) : 'N/A';
    document.getElementById('prop-hull').textContent = n === 3 ? '8' : '12';
    
    // Update sums display
    updateSumDisplay();
    
    // Update eigenvalue display
    updateEigenvalueDisplay();
    
    // Update covariance matrix display
    updateCovMatrixDisplay();
    
    // Update 3D viewer
    if (exploreGemViewer) {
        exploreGemViewer.updateSquare(exploreSquare);
    }
}

function handleCellClick(i, j) {
    if (!selectedSwapCell) {
        selectedSwapCell = [i, j];
    } else {
        // Perform swap
        exploreSquare = MagicSquares.swap(
            exploreSquare,
            selectedSwapCell[0], selectedSwapCell[1],
            i, j
        );
        selectedSwapCell = null;
    }
    updateExploreDisplay();
}

function updateSumDisplay() {
    const container = document.getElementById('sum-display');
    if (!container || !exploreSquare) return;
    
    const rowSums = MagicSquares.rowSums(exploreSquare);
    const colSums = MagicSquares.colSums(exploreSquare);
    const diagSums = MagicSquares.diagSums(exploreSquare);
    const M = MagicSquares.magicConstant(exploreSquare.length);
    
    container.innerHTML = `
        <div class="sum-row">
            <span>Rows:</span>
            ${rowSums.map(s => `<span class="${s === M ? 'success' : 'error'}">${s}</span>`).join(' ')}
        </div>
        <div class="sum-row">
            <span>Cols:</span>
            ${colSums.map(s => `<span class="${s === M ? 'success' : 'error'}">${s}</span>`).join(' ')}
        </div>
        <div class="sum-row">
            <span>Diags:</span>
            <span class="${diagSums[0] === M ? 'success' : 'error'}">${diagSums[0]}</span>
            <span class="${diagSums[1] === M ? 'success' : 'error'}">${diagSums[1]}</span>
        </div>
        <div class="sum-row">
            <span>Target:</span>
            <span>${M}</span>
        </div>
    `;
}

function updateEigenvalueDisplay() {
    const container = document.getElementById('eigenvalue-display');
    if (!container || !exploreSquare) return;
    
    const eigs = MagicSquares.eigenvalues(exploreSquare);
    
    container.innerHTML = `
        <span>λ₁ = ${eigs.largest}</span>
        <span>Tr = ${eigs.trace}</span>
        <span>Det = ${eigs.determinant !== null ? eigs.determinant : 'N/A'}</span>
    `;
}

function updateCovMatrixDisplay() {
    const container = document.getElementById('cov-matrix-display');
    if (!container || !exploreSquare) return;
    
    const cov = MagicSquares.covarianceMatrix(exploreSquare);
    
    const format = (v) => v.toFixed(4).padStart(8);
    
    container.innerHTML = `
        <pre>
┌                           ┐
│ ${format(cov[0][0])} ${format(cov[0][1])} ${format(cov[0][2])} │
│ ${format(cov[1][0])} ${format(cov[1][1])} ${format(cov[1][2])} │
│ ${format(cov[2][0])} ${format(cov[2][1])} ${format(cov[2][2])} │
└                           ┘
        </pre>
    `;
}

// ============================================================================
// PAPERCRAFT TAB
// ============================================================================

function generate3x3Squares() {
    // Start with Lo Shu
    const loShu = MagicSquares.loShu;
    
    // Check if rotation functions exist, if not create them
    if (!MagicSquares.rotate180) {
        MagicSquares.rotate180 = (sq) => MagicSquares.rotate90(MagicSquares.rotate90(sq));
    }
    if (!MagicSquares.rotate270) {
        MagicSquares.rotate270 = (sq) => MagicSquares.rotate90(MagicSquares.rotate90(MagicSquares.rotate90(sq)));
    }
    if (!MagicSquares.flipVertical) {
        MagicSquares.flipVertical = (sq) => [...sq].reverse();
    }
    
    // Generate all 8 unique squares using D4 symmetries
    allMagicSquares3x3 = [
        MagicSquares.copySquare(loShu),
        MagicSquares.rotate90(loShu),
        MagicSquares.rotate180(loShu),
        MagicSquares.rotate270(loShu),
        MagicSquares.flipHorizontal(loShu),
        MagicSquares.flipVertical(loShu),
        MagicSquares.flipHorizontal(MagicSquares.rotate90(loShu)),
        MagicSquares.flipVertical(MagicSquares.rotate90(loShu))
    ];
}

function initPapercraftTab() {
    papercraftGenerator = new PapercraftGenerator('paper-canvas');
    
    // Generate all 8 unique 3x3 magic squares (D4 orbit of Lo Shu)
    generate3x3Squares();
    
    // Initialize 3D viewer for comparison (with normalization)
    paperGemViewer = new MagicGem3D('paper-gem-canvas', {
        showVertices: false,
        showEdges: true,
        showFaces: true,
        showVectors: false,
        showAxes: true,
        autoRotate: false,
        normalizeZ: true  // Normalize for better visualization
    });
    
    // Wire up view buttons for 3x3 tab
    const papercraftSection = document.getElementById('papercraft');
    if (papercraftSection) {
        papercraftSection.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (paperGemViewer) {
                    paperGemViewer.setView(view);
                }
            });
        });
    }
    
    // Setup controls
    const showLabelsCheckbox = document.getElementById('paper-showLabels');
    const showEdgeLengthsCheckbox = document.getElementById('paper-showEdgeLength');
    const showGlueTabsCheckbox = document.getElementById('paper-showGlueTabs');
    const showCellValuesCheckbox = document.getElementById('paper-showCellValues');
    const colorFacesBtn = document.getElementById('paper-colorFaces');
    const epsilonInput = document.getElementById('paper-epsilon');
    const generateVariationBtn = document.getElementById('paper-generate-variation');
    const exportBtn = document.getElementById('paper-export');
    const printBtn = document.getElementById('paper-print');
    
    // Helper to refresh display
    const refreshDisplay = () => {
        if (papercraftGenerator.currentSquare) {
            const stats = papercraftGenerator.generateNet(
                papercraftGenerator.currentSquare, 
                parseFloat(epsilonInput.value)
            );
            updatePaperStats(stats);
        }
    };
    
    if (showLabelsCheckbox) {
        showLabelsCheckbox.addEventListener('change', (e) => {
            papercraftGenerator.showLabels = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (showEdgeLengthsCheckbox) {
        showEdgeLengthsCheckbox.addEventListener('change', (e) => {
            papercraftGenerator.showEdgeLengths = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (showGlueTabsCheckbox) {
        showGlueTabsCheckbox.addEventListener('change', (e) => {
            papercraftGenerator.showGlueTabs = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (showCellValuesCheckbox) {
        showCellValuesCheckbox.addEventListener('change', (e) => {
            papercraftGenerator.showCellValues = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (generateVariationBtn) {
        generateVariationBtn.addEventListener('click', () => {
            if (papercraftGenerator.currentSquare) {
                const epsilon = parseFloat(epsilonInput.value);
                // Generate new variation with random starting face
                papercraftGenerator.generateVariation = true;
                refreshDisplay();
                papercraftGenerator.generateVariation = false;
            }
        });
    }
    
    if (colorFacesBtn && epsilonInput) {
        colorFacesBtn.addEventListener('click', () => {
            // Also update 3D viewer coloring
            if (paperGemViewer && papercraftGenerator.currentSquare) {
                const epsilon = parseFloat(epsilonInput.value);
                paperGemViewer.recolorFaces(epsilon);
            }
            refreshDisplay();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (papercraftGenerator.currentSquare) {
                const squareNum = document.getElementById('paper-square-num')?.textContent || '1';
                papercraftGenerator.exportAsImage(`magic-gem-square-${squareNum}.png`, 3);
            }
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (papercraftGenerator.currentSquare) {
                papercraftGenerator.print();
            }
        });
    }
    
    // Populate square grid
    populatePaperSquareGrid();
}

function populatePaperSquareGrid() {
    const grid = document.getElementById('paper-square-grid');
    if (!grid || allMagicSquares3x3.length === 0) {
        // Wait for generation
        setTimeout(populatePaperSquareGrid, 100);
        return;
    }
    
    grid.innerHTML = '';
    let selectedDiv = null;
    
    allMagicSquares3x3.forEach((square, index) => {
        const squareDiv = document.createElement('div');
        squareDiv.className = 'square-container n3';
        squareDiv.dataset.index = index;
        squareDiv.style.gridTemplateColumns = 'repeat(3, 1fr)';
        
        squareDiv.onclick = () => {
            if (selectedDiv) {
                selectedDiv.classList.remove('selected');
            }
            selectedDiv = squareDiv;
            squareDiv.classList.add('selected');
            selectPaperSquare(square, index);
        };
        
        // Create 3x3 grid
        square.forEach(row => {
            row.forEach(value => {
                const cell = document.createElement('div');
                cell.className = 'square-cell';
                cell.textContent = value;
                squareDiv.appendChild(cell);
            });
        });
        
        grid.appendChild(squareDiv);
    });
    
    // Select first square (Lo Shu)
    if (allMagicSquares3x3.length > 0) {
        selectPaperSquare(allMagicSquares3x3[0], 0);
        grid.firstChild.classList.add('selected');
        selectedDiv = grid.firstChild;
    }
}

function selectPaperSquare(square, index) {
    if (!papercraftGenerator) return;
    
    papercraftGenerator.currentSquare = square;
    const epsilon = parseFloat(document.getElementById('paper-epsilon').value);
    
    // Update 3D viewer with same square and coloring
    if (paperGemViewer) {
        paperGemViewer.updateSquare(square);
        // Apply same face coloring as the net
        paperGemViewer.recolorFaces(epsilon);
    }
    
    // Get hull data from 3D viewer
    let hullData = null;
    if (paperGemViewer) {
        hullData = paperGemViewer.getHullData();
    }
    
    const stats = papercraftGenerator.generateNet(square, epsilon, hullData);
    
    updatePaperStats(stats);
    
    // Update square number
    const numDisplay = document.getElementById('paper-square-num');
    if (numDisplay) {
        numDisplay.textContent = index + 1;
    }
}

function updatePaperStats(stats) {
    const statMap = {
        'paper-stat-faces': stats.faces,
        'paper-stat-groups': stats.groups,
        'paper-stat-edges': stats.edges
    };
    
    Object.entries(statMap).forEach(([id, value]) => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.textContent = value;
        }
    });
}

// ============================================================================
// PAPERCRAFT 4X4 TAB
// ============================================================================

function initPapercraft4x4Tab() {
    papercraft4x4Generator = new PapercraftGenerator('paper4x4-canvas');
    
    // Initialize 3D viewer for comparison (with normalization)
    paper4x4GemViewer = new MagicGem3D('paper4x4-gem-canvas', {
        showVertices: false,
        showEdges: true,
        showFaces: true,
        showVectors: false,
        showAxes: true,
        autoRotate: false,
        normalizeZ: true  // Normalize for better visualization
    });
    
    // Wire up view buttons for 4x4 tab
    const paper4x4Section = document.getElementById('papercraft4x4');
    if (paper4x4Section) {
        paper4x4Section.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (paper4x4GemViewer) {
                    paper4x4GemViewer.setView(view);
                }
            });
        });
    }
    
    // Setup controls
    const showLabelsCheckbox = document.getElementById('paper4x4-showLabels');
    const showEdgeLengthsCheckbox = document.getElementById('paper4x4-showEdgeLength');
    const showGlueTabsCheckbox = document.getElementById('paper4x4-showGlueTabs');
    const showCellValuesCheckbox = document.getElementById('paper4x4-showCellValues');
    const colorFacesBtn = document.getElementById('paper4x4-colorFaces');
    const epsilonInput = document.getElementById('paper4x4-epsilon');
    const generateVariationBtn = document.getElementById('paper4x4-generate-variation');
    const exportBtn = document.getElementById('paper4x4-export');
    const printBtn = document.getElementById('paper4x4-print');
    
    // Helper to refresh display
    const refreshDisplay = () => {
        if (papercraft4x4Generator.currentSquare) {
            const stats = papercraft4x4Generator.generateNet(
                papercraft4x4Generator.currentSquare, 
                parseFloat(epsilonInput.value)
            );
            updatePaper4x4Stats(stats);
        }
    };
    
    if (showLabelsCheckbox) {
        showLabelsCheckbox.addEventListener('change', (e) => {
            papercraft4x4Generator.showLabels = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (showEdgeLengthsCheckbox) {
        showEdgeLengthsCheckbox.addEventListener('change', (e) => {
            papercraft4x4Generator.showEdgeLengths = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (showGlueTabsCheckbox) {
        showGlueTabsCheckbox.addEventListener('change', (e) => {
            papercraft4x4Generator.showGlueTabs = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (showCellValuesCheckbox) {
        showCellValuesCheckbox.addEventListener('change', (e) => {
            papercraft4x4Generator.showCellValues = e.target.checked;
            refreshDisplay();
        });
    }
    
    if (generateVariationBtn) {
        generateVariationBtn.addEventListener('click', () => {
            if (papercraft4x4Generator.currentSquare) {
                const epsilon = parseFloat(epsilonInput.value);
                // Generate new variation with random starting face
                papercraft4x4Generator.generateVariation = true;
                refreshDisplay();
                papercraft4x4Generator.generateVariation = false;
            }
        });
    }
    
    if (colorFacesBtn && epsilonInput) {
        colorFacesBtn.addEventListener('click', () => {
            // Also update 3D viewer coloring
            if (paper4x4GemViewer && papercraft4x4Generator.currentSquare) {
                const epsilon = parseFloat(epsilonInput.value);
                paper4x4GemViewer.recolorFaces(epsilon);
            }
            refreshDisplay();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (papercraft4x4Generator.currentSquare) {
                const squareNum = document.getElementById('paper4x4-square-num')?.textContent || '1';
                papercraft4x4Generator.exportAsImage(`magic-gem-4x4-square-${squareNum}.png`, 3);
            }
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (papercraft4x4Generator.currentSquare) {
                papercraft4x4Generator.print();
            }
        });
    }
    
    // Populate square grid
    populatePaper4x4SquareGrid();
}

function populatePaper4x4SquareGrid() {
    const grid = document.getElementById('paper4x4-square-grid');
    if (!grid) return;
    
    if (allMagicSquares4x4.length === 0) {
        // Wait for data to load
        setTimeout(populatePaper4x4SquareGrid, 100);
        return;
    }
    
    grid.innerHTML = '';
    let selectedDiv = null;
    
    // Show first 20 4x4 squares for performance
    const squaresToShow = Math.min(20, allMagicSquares4x4.length);
    
    for (let index = 0; index < squaresToShow; index++) {
        const square = allMagicSquares4x4[index];
        const squareDiv = document.createElement('div');
        squareDiv.className = 'square-container n4';
        squareDiv.dataset.index = index;
        squareDiv.style.gridTemplateColumns = 'repeat(4, 1fr)';
        
        squareDiv.onclick = () => {
            if (selectedDiv) {
                selectedDiv.classList.remove('selected');
            }
            selectedDiv = squareDiv;
            squareDiv.classList.add('selected');
            selectPaper4x4Square(square, index);
        };
        
        // Create 4x4 grid
        square.forEach(row => {
            row.forEach(value => {
                const cell = document.createElement('div');
                cell.className = 'square-cell';
                cell.textContent = value;
                squareDiv.appendChild(cell);
            });
        });
        
        grid.appendChild(squareDiv);
    }
    
    // Select first square
    if (squaresToShow > 0) {
        selectPaper4x4Square(allMagicSquares4x4[0], 0);
        grid.firstChild.classList.add('selected');
        selectedDiv = grid.firstChild;
    }
}

function selectPaper4x4Square(square, index) {
    if (!papercraft4x4Generator) return;
    
    papercraft4x4Generator.currentSquare = square;
    const epsilon = parseFloat(document.getElementById('paper4x4-epsilon').value);
    
    // Update 3D viewer with same square and coloring
    if (paper4x4GemViewer) {
        paper4x4GemViewer.updateSquare(square);
        // Apply same face coloring as the net
        paper4x4GemViewer.recolorFaces(epsilon);
    }
    
    // Get hull data from 3D viewer
    let hullData = null;
    if (paper4x4GemViewer) {
        hullData = paper4x4GemViewer.getHullData();
    }
    
    const stats = papercraft4x4Generator.generateNet(square, epsilon, hullData);
    
    updatePaper4x4Stats(stats);
    
    // Update square number
    const numDisplay = document.getElementById('paper4x4-square-num');
    if (numDisplay) {
        numDisplay.textContent = index + 1;
    }
}

function updatePaper4x4Stats(stats) {
    const statMap = {
        'paper4x4-stat-faces': stats.faces,
        'paper4x4-stat-groups': stats.groups,
        'paper4x4-stat-edges': stats.edges
    };
    
    Object.entries(statMap).forEach(([id, value]) => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.textContent = value;
        }
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ============================================================================
// INTERACTIVE BUILDER TAB
// ============================================================================

function initBuilderTab() {
    // Will be initialized when tab is first opened
}

function loadBuilderContent() {
    if (paperCraftBuilder) return; // Already initialized
    
    const container = document.getElementById('builder-canvas');
    if (!container) {
        console.error('Builder canvas container not found');
        return;
    }
    
    try {
        paperCraftBuilder = new PaperCraftBuilder('builder-canvas');
        
        // Load current paper net into builder
        // First try 3x3 papercraft, then 4x4 papercraft
        let netData = null;
        if (papercraftGenerator && papercraftGenerator.currentNet) {
            netData = papercraftGenerator.currentNet;
        } else if (papercraft4x4Generator && papercraft4x4Generator.currentNet) {
            netData = papercraft4x4Generator.currentNet;
        }
        
        if (netData) {
            const { net, faceGroups } = netData;
            paperCraftBuilder.loadPieces(net, faceGroups);
        } else {
            console.log('No papercraft data available yet. Visit Paper Nets tab first to generate a shape.');
        }
    } catch (error) {
        console.error('Error initializing builder:', error);
    }
    
    // Wire up controls
    document.getElementById('builder-reset')?.addEventListener('click', () => {
        if (paperCraftBuilder) paperCraftBuilder.reset();
    });
    
    document.getElementById('builder-explode')?.addEventListener('click', () => {
        if (paperCraftBuilder) paperCraftBuilder.explode();
    });
    
    document.getElementById('builder-auto-fold')?.addEventListener('click', () => {
        if (paperCraftBuilder) paperCraftBuilder.autoFold();
    });
    
    document.getElementById('builder-flip-h')?.addEventListener('click', () => {
        if (paperCraftBuilder) {
            const piece = paperCraftBuilder.selectedPiece || paperCraftBuilder.hoveredPiece;
            if (piece) {
                paperCraftBuilder.flipPieceHorizontal(piece);
            }
        }
    });
    
    document.getElementById('builder-flip-v')?.addEventListener('click', () => {
        if (paperCraftBuilder) {
            const piece = paperCraftBuilder.selectedPiece || paperCraftBuilder.hoveredPiece;
            if (piece) {
                paperCraftBuilder.flipPieceVertical(piece);
            }
        }
    });
    
    document.getElementById('builder-unpair')?.addEventListener('click', () => {
        if (paperCraftBuilder) {
            const piece = paperCraftBuilder.selectedPiece || paperCraftBuilder.hoveredPiece;
            if (piece) {
                paperCraftBuilder.disconnectPiece(piece);
            }
        }
    });
    
    document.getElementById('builder-snap-enabled')?.addEventListener('change', (e) => {
        if (paperCraftBuilder) paperCraftBuilder.snapEnabled = e.target.checked;
    });
    
    document.getElementById('builder-show-edges')?.addEventListener('change', (e) => {
        if (paperCraftBuilder) paperCraftBuilder.showEdges = e.target.checked;
    });
    
    document.getElementById('builder-show-labels')?.addEventListener('change', (e) => {
        if (paperCraftBuilder) paperCraftBuilder.showLabels = e.target.checked;
        // Reload pieces to update labels
        if (papercraftGenerator && papercraftGenerator.currentNet) {
            const { net, faceGroups } = papercraftGenerator.currentNet;
            paperCraftBuilder.loadPieces(net, faceGroups);
        }
    });
    
    const snapDistanceSlider = document.getElementById('builder-snap-distance');
    const snapDistanceValue = document.getElementById('builder-snap-distance-value');
    if (snapDistanceSlider && snapDistanceValue) {
        snapDistanceSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            snapDistanceValue.textContent = value.toFixed(2);
            if (paperCraftBuilder) paperCraftBuilder.snapDistance = value;
        });
    }
}

// Handle window resize
window.addEventListener('resize', debounce(() => {
    if (mainGemViewer) mainGemViewer.onResize();
    if (exploreGemViewer) exploreGemViewer.onResize();
    if (enumGemViewer) enumGemViewer.onResize();
    if (paperGemViewer) paperGemViewer.onResize();
    if (paper4x4GemViewer) paper4x4GemViewer.onResize();
    if (paperCraftBuilder) paperCraftBuilder.onResize();
}, 250));
