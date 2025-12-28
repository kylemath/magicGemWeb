/**
 * Magic Squares Utilities
 * Core mathematical functions for magic squares and Magic Gems
 */

const MagicSquares = {
    
    // Predefined magic squares
    loShu: [
        [2, 7, 6],
        [9, 5, 1],
        [4, 3, 8]
    ],
    
    /**
     * Generate magic square using Siamese method (odd n only)
     */
    siamese(n) {
        if (n % 2 === 0) throw new Error("Siamese method requires odd n");
        
        const square = Array(n).fill(null).map(() => Array(n).fill(0));
        let i = 0;
        let j = Math.floor(n / 2);
        
        for (let num = 1; num <= n * n; num++) {
            square[i][j] = num;
            const i_new = (i - 1 + n) % n;
            const j_new = (j + 1) % n;
            
            if (square[i_new][j_new] !== 0) {
                i = (i + 1) % n;
            } else {
                i = i_new;
                j = j_new;
            }
        }
        
        return square;
    },
    
    /**
     * Generate magic square using doubly-even method (n divisible by 4)
     */
    doublyEven(n) {
        if (n % 4 !== 0) throw new Error("Doubly-even method requires n divisible by 4");
        
        const square = [];
        let num = 1;
        for (let i = 0; i < n; i++) {
            square[i] = [];
            for (let j = 0; j < n; j++) {
                square[i][j] = num++;
            }
        }
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if ((i % 4 === j % 4) || ((i % 4) + (j % 4) === 3)) {
                    square[i][j] = n * n + 1 - square[i][j];
                }
            }
        }
        
        return square;
    },
    
    /**
     * Generate a random arrangement
     */
    randomArrangement(n) {
        const values = [];
        for (let i = 1; i <= n * n; i++) values.push(i);
        
        // Fisher-Yates shuffle
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        
        const square = [];
        for (let i = 0; i < n; i++) {
            square[i] = values.slice(i * n, (i + 1) * n);
        }
        
        return square;
    },
    
    /**
     * Check if arrangement is a magic square
     */
    isMagic(square) {
        const n = square.length;
        const M = this.magicConstant(n);
        
        // Check rows
        for (let i = 0; i < n; i++) {
            if (square[i].reduce((a, b) => a + b, 0) !== M) return false;
        }
        
        // Check columns
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < n; i++) sum += square[i][j];
            if (sum !== M) return false;
        }
        
        // Check diagonals
        let mainDiag = 0, antiDiag = 0;
        for (let i = 0; i < n; i++) {
            mainDiag += square[i][i];
            antiDiag += square[i][n - 1 - i];
        }
        
        return mainDiag === M && antiDiag === M;
    },
    
    /**
     * Magic constant for n×n square
     */
    magicConstant(n) {
        return Math.floor(n * (n * n + 1) / 2);
    },
    
    /**
     * Get row sums
     */
    rowSums(square) {
        return square.map(row => row.reduce((a, b) => a + b, 0));
    },
    
    /**
     * Get column sums
     */
    colSums(square) {
        const n = square.length;
        const sums = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < n; i++) sum += square[i][j];
            sums.push(sum);
        }
        return sums;
    },
    
    /**
     * Get diagonal sums [main, anti]
     */
    diagSums(square) {
        const n = square.length;
        let main = 0, anti = 0;
        for (let i = 0; i < n; i++) {
            main += square[i][i];
            anti += square[i][n - 1 - i];
        }
        return [main, anti];
    },
    
    /**
     * Convert to 3D coordinates (Magic Gem)
     * @param {Array} square - The magic square
     * @param {boolean} normalize - If true, scale z to match x,y range
     */
    toCoordinates(square, normalize = false) {
        const n = square.length;
        const offset = (n - 1) / 2;
        const zCenter = (n * n + 1) / 2;
        
        // Normalization factor to scale z to match x,y range
        // x,y span: n-1, z span: n²-1
        // scale = (n-1)/(n²-1) = 1/(n+1)
        const zScale = normalize ? 1.0 / (n + 1) : 1.0;
        
        const coords = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                coords.push({
                    x: j - offset,
                    y: offset - i,
                    z: (square[i][j] - zCenter) * zScale,
                    value: square[i][j],
                    row: i,
                    col: j
                });
            }
        }
        
        return coords;
    },
    
    /**
     * Compute covariance energy E(S)
     */
    computeEnergy(square) {
        const coords = this.toCoordinates(square);
        const n = square.length;
        
        // Extract x, y, z
        const x = coords.map(c => c.x);
        const y = coords.map(c => c.y);
        const z = coords.map(c => c.z);
        
        // Compute covariances (means are all 0 by construction)
        const covXZ = this.mean(x.map((xi, i) => xi * z[i]));
        const covYZ = this.mean(y.map((yi, i) => yi * z[i]));
        
        // Diagonal covariances
        const nSq = n * n;
        const dMain = new Array(nSq).fill(0);
        const dAnti = new Array(nSq).fill(0);
        
        for (let i = 0; i < n; i++) {
            dMain[i * n + i] = 1;
            dAnti[i * n + (n - 1 - i)] = 1;
        }
        
        const covMainZ = this.mean(dMain.map((d, i) => d * z[i]));
        const covAntiZ = this.mean(dAnti.map((d, i) => d * z[i]));
        
        return covXZ * covXZ + covYZ * covYZ + covMainZ * covMainZ + covAntiZ * covAntiZ;
    },
    
    /**
     * Compute individual covariances
     */
    computeCovariances(square) {
        const coords = this.toCoordinates(square);
        const n = square.length;
        
        const x = coords.map(c => c.x);
        const y = coords.map(c => c.y);
        const z = coords.map(c => c.z);
        
        return {
            covXZ: this.mean(x.map((xi, i) => xi * z[i])),
            covYZ: this.mean(y.map((yi, i) => yi * z[i]))
        };
    },
    
    /**
     * Compute full covariance matrix
     */
    covarianceMatrix(square) {
        const coords = this.toCoordinates(square);
        const x = coords.map(c => c.x);
        const y = coords.map(c => c.y);
        const z = coords.map(c => c.z);
        
        const varX = this.mean(x.map(xi => xi * xi));
        const varY = this.mean(y.map(yi => yi * yi));
        const varZ = this.mean(z.map(zi => zi * zi));
        const covXY = this.mean(x.map((xi, i) => xi * y[i]));
        const covXZ = this.mean(x.map((xi, i) => xi * z[i]));
        const covYZ = this.mean(y.map((yi, i) => yi * z[i]));
        
        return [
            [varX, covXY, covXZ],
            [covXY, varY, covYZ],
            [covXZ, covYZ, varZ]
        ];
    },
    
    /**
     * Compute eigenvalues of the magic square matrix
     */
    eigenvalues(square) {
        // Simple power iteration for largest eigenvalue
        // For full eigenvalues, would need more sophisticated approach
        const n = square.length;
        const M = this.magicConstant(n);
        
        // We know M is the largest eigenvalue
        // Compute determinant and trace for others
        const trace = this.trace(square);
        const det = this.determinant(square);
        
        return {
            largest: M,
            trace: trace,
            determinant: det
        };
    },
    
    /**
     * Compute trace
     */
    trace(square) {
        let sum = 0;
        for (let i = 0; i < square.length; i++) {
            sum += square[i][i];
        }
        return sum;
    },
    
    /**
     * Compute determinant (3x3 only for simplicity)
     */
    determinant(square) {
        const n = square.length;
        if (n === 3) {
            const [[a,b,c],[d,e,f],[g,h,i]] = square;
            return a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g);
        }
        // For larger matrices, would need LU decomposition
        return null;
    },
    
    /**
     * Apply D4 transformation
     */
    applyD4(square, k, flip) {
        let result = this.copySquare(square);
        
        // Rotate k times (90° each)
        for (let r = 0; r < k; r++) {
            result = this.rotate90(result);
        }
        
        // Flip horizontally if needed
        if (flip) {
            result = this.flipHorizontal(result);
        }
        
        return result;
    },
    
    /**
     * Rotate 90° clockwise
     */
    rotate90(square) {
        const n = square.length;
        const result = [];
        for (let i = 0; i < n; i++) {
            result[i] = [];
            for (let j = 0; j < n; j++) {
                result[i][j] = square[n - 1 - j][i];
            }
        }
        return result;
    },
    
    /**
     * Flip horizontally
     */
    flipHorizontal(square) {
        return square.map(row => [...row].reverse());
    },
    
    /**
     * Flip vertically
     */
    flipVertical(square) {
        return [...square].reverse();
    },
    
    /**
     * Rotate 180 degrees
     */
    rotate180(square) {
        return this.rotate90(this.rotate90(square));
    },
    
    /**
     * Rotate 270 degrees (or -90)
     */
    rotate270(square) {
        return this.rotate90(this.rotate90(this.rotate90(square)));
    },
    
    /**
     * Random D4 transformation
     */
    randomD4(square) {
        const k = Math.floor(Math.random() * 4);
        const flip = Math.random() < 0.5;
        return this.applyD4(square, k, flip);
    },
    
    /**
     * Deep copy a square
     */
    copySquare(square) {
        return square.map(row => [...row]);
    },
    
    /**
     * Swap two cells
     */
    swap(square, i1, j1, i2, j2) {
        const result = this.copySquare(square);
        [result[i1][j1], result[i2][j2]] = [result[i2][j2], result[i1][j1]];
        return result;
    },
    
    // Utility functions
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    },
    
    variance(arr) {
        const m = this.mean(arr);
        return this.mean(arr.map(x => (x - m) * (x - m)));
    }
};

// Make available globally
window.MagicSquares = MagicSquares;
