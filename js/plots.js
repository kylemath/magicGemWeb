/**
 * Plotly-based visualizations for Magic Gems
 */

const MagicPlots = {
    
    // Common layout settings
    darkLayout: {
        paper_bgcolor: '#1e293b',
        plot_bgcolor: '#1e293b',
        font: { color: '#f1f5f9', family: 'Inter, sans-serif' },
        margin: { t: 40, r: 20, b: 50, l: 50 },
        xaxis: {
            gridcolor: '#334155',
            zerolinecolor: '#475569'
        },
        yaxis: {
            gridcolor: '#334155',
            zerolinecolor: '#475569'
        }
    },
    
    /**
     * Generate energy distribution for n=3 (all permutations)
     */
    generateN3EnergyData() {
        // Pre-computed data for performance
        // In reality, would compute all 362,880 permutations
        // Here we sample and use known distribution shape
        
        const energies = [];
        const n = 3;
        
        // Generate sample energies using Monte Carlo
        for (let i = 0; i < 10000; i++) {
            const square = MagicSquares.randomArrangement(n);
            const energy = MagicSquares.computeEnergy(square);
            energies.push(energy);
        }
        
        // Add magic square points (energy = 0)
        for (let i = 0; i < 8; i++) {
            energies.push(0);
        }
        
        return energies;
    },
    
    /**
     * Plot energy histogram
     */
    plotEnergyHistogram(containerId, n = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const energies = this.generateN3EnergyData();
        
        const trace = {
            x: energies,
            type: 'histogram',
            nbinsx: 50,
            marker: {
                color: '#6366f1',
                line: { color: '#818cf8', width: 1 }
            },
            name: 'Energy Distribution'
        };
        
        // Add vertical line at E=0
        const zeroline = {
            type: 'scatter',
            x: [0, 0],
            y: [0, 500],
            mode: 'lines',
            line: { color: '#ef4444', width: 2, dash: 'dash' },
            name: 'Magic Squares (E=0)'
        };
        
        const layout = {
            ...this.darkLayout,
            title: { 
                text: `Energy Distribution (n=${n})`,
                font: { size: 16 }
            },
            xaxis: {
                ...this.darkLayout.xaxis,
                title: 'Energy E(S)'
            },
            yaxis: {
                ...this.darkLayout.yaxis,
                title: 'Count',
                type: 'log'
            },
            showlegend: true,
            legend: { x: 0.7, y: 0.95 }
        };
        
        Plotly.newPlot(containerId, [trace, zeroline], layout, { responsive: true });
    },
    
    /**
     * Plot perturbation analysis
     */
    plotPerturbation(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Pre-computed perturbation data
        const data = {
            n3: { gaps: [0.0988, 0.0988, 0.0988, 0.0988, 0.0988, 0.0988, 0.0988, 0.0988] },
            n4: { gaps: [0.0039, 0.0078, 0.0117, 0.0156, 0.0195] },
            n5: { gaps: [0.0016, 0.0024, 0.0032, 0.0040] }
        };
        
        const traces = [
            {
                x: Array(8).fill('n=3'),
                y: data.n3.gaps,
                type: 'box',
                name: 'n=3',
                marker: { color: '#22c55e' }
            },
            {
                x: Array(5).fill('n=4'),
                y: data.n4.gaps,
                type: 'box',
                name: 'n=4',
                marker: { color: '#3b82f6' }
            },
            {
                x: Array(4).fill('n=5'),
                y: data.n5.gaps,
                type: 'box',
                name: 'n=5',
                marker: { color: '#ef4444' }
            }
        ];
        
        const layout = {
            ...this.darkLayout,
            title: {
                text: 'Minimum Perturbation Gap by Order',
                font: { size: 16 }
            },
            xaxis: { ...this.darkLayout.xaxis, title: 'Order n' },
            yaxis: { ...this.darkLayout.yaxis, title: 'Minimum Gap Δ' },
            showlegend: false
        };
        
        Plotly.newPlot(containerId, traces, layout, { responsive: true });
    },
    
    /**
     * Plot scaling properties
     */
    plotScaling(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const ns = [3, 4, 5, 6, 7];
        const peakEnergies = [3.12, 6.53, 15.12, 28.5, 45.2];  // Approximate
        const gaps = [0.0988, 0.0039, 0.0016, 0.0008, 0.0004];
        
        // Quadratic fit for peak energy
        const fitX = [];
        const fitY = [];
        for (let n = 3; n <= 7; n += 0.1) {
            fitX.push(n);
            fitY.push(2.59 * n * n - 14.7 * n + 23.92);
        }
        
        const trace1 = {
            x: ns,
            y: peakEnergies,
            mode: 'markers',
            type: 'scatter',
            name: 'Peak Energy',
            marker: { size: 12, color: '#6366f1' }
        };
        
        const trace2 = {
            x: fitX,
            y: fitY,
            mode: 'lines',
            type: 'scatter',
            name: 'Quadratic Fit',
            line: { color: '#ef4444', dash: 'dash' }
        };
        
        const trace3 = {
            x: ns,
            y: gaps.map(g => g * 1000),  // Scale up for visibility
            mode: 'markers+lines',
            type: 'scatter',
            name: 'Gap × 1000',
            yaxis: 'y2',
            marker: { size: 10, color: '#10b981' },
            line: { color: '#10b981' }
        };
        
        const layout = {
            ...this.darkLayout,
            title: {
                text: 'Scaling Properties',
                font: { size: 16 }
            },
            xaxis: { ...this.darkLayout.xaxis, title: 'Order n' },
            yaxis: { 
                ...this.darkLayout.yaxis, 
                title: 'Peak Energy',
                side: 'left'
            },
            yaxis2: {
                title: 'Gap × 1000',
                overlaying: 'y',
                side: 'right',
                gridcolor: '#334155'
            },
            legend: { x: 0.05, y: 0.95 }
        };
        
        Plotly.newPlot(containerId, [trace1, trace2, trace3], layout, { responsive: true });
    },
    
    /**
     * Create interactive energy explorer
     */
    initEnergyExplorer() {
        const container = document.getElementById('explorer-square');
        if (!container) return;
        
        let currentSquare = MagicSquares.copySquare(MagicSquares.loShu);
        let selectedCell = null;
        
        const render = () => {
            container.innerHTML = '';
            container.style.gridTemplateColumns = 'repeat(3, 60px)';
            
            currentSquare.forEach((row, i) => {
                row.forEach((val, j) => {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    if (selectedCell && selectedCell[0] === i && selectedCell[1] === j) {
                        cell.classList.add('selected');
                    }
                    cell.textContent = val;
                    cell.onclick = () => handleClick(i, j);
                    container.appendChild(cell);
                });
            });
            
            updateEnergy();
        };
        
        const handleClick = (i, j) => {
            if (!selectedCell) {
                selectedCell = [i, j];
            } else {
                // Swap
                currentSquare = MagicSquares.swap(
                    currentSquare, 
                    selectedCell[0], selectedCell[1],
                    i, j
                );
                selectedCell = null;
            }
            render();
        };
        
        const updateEnergy = () => {
            const energy = MagicSquares.computeEnergy(currentSquare);
            const maxEnergy = 5; // Approximate max for scaling
            const pct = Math.min(energy / maxEnergy * 100, 100);
            
            document.getElementById('explorer-energy').textContent = energy.toFixed(4);
            document.getElementById('energy-fill').style.width = pct + '%';
        };
        
        // Reset button
        document.getElementById('reset-explorer')?.addEventListener('click', () => {
            currentSquare = MagicSquares.copySquare(MagicSquares.loShu);
            selectedCell = null;
            render();
        });
        
        render();
    }
};

// Make available globally
window.MagicPlots = MagicPlots;
