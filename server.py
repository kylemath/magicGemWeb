"""
Python Backend Server for Magic Gems Web App

This server provides:
1. Static file serving for the web app
2. API endpoints for generating magic square data
3. Pre-computed data for visualizations

Run with: python3 server.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import json
import os
import numpy as np
from urllib.parse import urlparse, parse_qs
from itertools import permutations

PORT = 8880

# ============================================================================
# MAGIC SQUARE UTILITIES
# ============================================================================

def siamese_method(n):
    """Generate magic square using Siamese method (odd n only)."""
    if n % 2 == 0:
        raise ValueError("Siamese method requires odd n")
    
    square = np.zeros((n, n), dtype=int)
    i, j = 0, n // 2
    
    for num in range(1, n*n + 1):
        square[i, j] = num
        i_new, j_new = (i - 1) % n, (j + 1) % n
        if square[i_new, j_new] != 0:
            i_new, j_new = (i + 1) % n, j
        i, j = i_new, j_new
    
    return square

def doubly_even_method(n):
    """Generate magic square using doubly-even method (n divisible by 4)."""
    if n % 4 != 0:
        raise ValueError("Doubly-even method requires n divisible by 4")
    
    square = np.arange(1, n*n + 1).reshape(n, n)
    
    for i in range(n):
        for j in range(n):
            if ((i % 4 == j % 4) or ((i % 4) + (j % 4) == 3)):
                square[i, j] = n*n + 1 - square[i, j]
    
    return square

def square_to_coordinates(square, normalize=False):
    """Convert magic square to 3D coordinates.
    
    Args:
        square: n×n numpy array
        normalize: If True, scale z to match x,y range
    """
    n = square.shape[0]
    offset = (n - 1) / 2
    z_center = (n**2 + 1) / 2
    
    # Normalization factor to scale z to match x,y range
    # x,y span: n-1, z span: n²-1
    # scale = (n-1)/(n²-1) = 1/(n+1)
    z_scale = 1.0 / (n + 1) if normalize else 1.0
    
    coords = []
    for i in range(n):
        for j in range(n):
            coords.append({
                'x': j - offset,
                'y': offset - i,
                'z': float((square[i, j] - z_center) * z_scale),
                'value': int(square[i, j])
            })
    return coords

def compute_energy(square):
    """Compute total magic energy E(S)."""
    n = square.shape[0]
    offset = (n - 1) / 2
    z_center = (n**2 + 1) / 2
    
    x = np.array([j - offset for i in range(n) for j in range(n)])
    y = np.array([offset - i for i in range(n) for j in range(n)])
    z = square.flatten() - z_center
    
    cov_xz = np.mean(x * z)
    cov_yz = np.mean(y * z)
    
    # Diagonal covariances
    n_sq = n * n
    D_main = np.zeros(n_sq)
    D_anti = np.zeros(n_sq)
    for i in range(n):
        D_main[i * n + i] = 1
        D_anti[i * n + (n - 1 - i)] = 1
    
    cov_main = np.mean(D_main * z)
    cov_anti = np.mean(D_anti * z)
    
    return float(cov_xz**2 + cov_yz**2 + cov_main**2 + cov_anti**2)

def generate_energy_distribution(n, num_samples=10000):
    """Generate energy distribution via sampling."""
    energies = []
    
    for _ in range(num_samples):
        perm = np.random.permutation(range(1, n*n + 1))
        square = perm.reshape(n, n)
        energies.append(compute_energy(square))
    
    return energies

# ============================================================================
# PRE-COMPUTED DATA
# ============================================================================

def generate_precomputed_data():
    """Generate all pre-computed data for the web app."""
    
    data = {
        'magicSquares': {},
        'energyDistributions': {},
        'scalingData': {}
    }
    
    # Magic squares for each order
    for n in [3, 5]:
        sq = siamese_method(n)
        data['magicSquares'][n] = {
            'square': sq.tolist(),
            'coordinates': square_to_coordinates(sq),
            'energy': compute_energy(sq)
        }
    
    # n=4
    sq4 = doubly_even_method(4)
    data['magicSquares'][4] = {
        'square': sq4.tolist(),
        'coordinates': square_to_coordinates(sq4),
        'energy': compute_energy(sq4)
    }
    
    # Energy distributions (sampled)
    print("Generating energy distributions...")
    for n in [3, 4, 5]:
        print(f"  n={n}...")
        data['energyDistributions'][n] = generate_energy_distribution(n, 5000)
    
    # Scaling data
    data['scalingData'] = {
        'orders': [3, 4, 5],
        'peakEnergies': [3.12, 6.53, 15.12],
        'minGaps': [0.0988, 0.0039, 0.0016],
        'hullVertices': [8, 12, 12]
    }
    
    return data

# ============================================================================
# HTTP SERVER
# ============================================================================

class MagicGemsHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for the Magic Gems web app."""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve (parent directory to access both web and data)
        web_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(web_dir)
        super().__init__(*args, directory=parent_dir, **kwargs)
    
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        # API endpoints
        if path.startswith('/api/'):
            self.handle_api(path, parsed.query)
            return
        
        # Handle different paths
        if path == '/':
            # Serve index.html from web directory
            self.path = '/web/index.html'
        elif path.startswith('/data/'):
            # Data files are in parent/data, already correct
            pass
        elif not path.startswith('/web/'):
            # Other resources should be in web directory
            self.path = '/web' + path
        
        # Serve static files
        super().do_GET()
    
    def handle_api(self, path, query):
        """Handle API requests."""
        try:
            if path == '/api/magic-square':
                self.api_magic_square(query)
            elif path == '/api/energy':
                self.api_energy(query)
            elif path == '/api/precomputed':
                self.api_precomputed()
            elif path == '/api/magic-squares-4x4':
                self.api_magic_squares_4x4()
            else:
                self.send_error(404, 'API endpoint not found')
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def api_magic_square(self, query):
        """Generate a magic square."""
        params = parse_qs(query)
        n = int(params.get('n', [3])[0])
        method = params.get('method', ['siamese'])[0]
        
        if method == 'siamese' and n % 2 == 1:
            square = siamese_method(n)
        elif method == 'doubly-even' and n % 4 == 0:
            square = doubly_even_method(4)
        else:
            # Random arrangement
            perm = np.random.permutation(range(1, n*n + 1))
            square = perm.reshape(n, n)
        
        self.send_json({
            'square': square.tolist(),
            'coordinates': square_to_coordinates(square),
            'energy': compute_energy(square)
        })
    
    def api_energy(self, query):
        """Compute energy for a given arrangement."""
        params = parse_qs(query)
        values = params.get('values', [''])[0]
        n = int(params.get('n', [3])[0])
        
        if values:
            arr = np.array([int(v) for v in values.split(',')]).reshape(n, n)
            energy = compute_energy(arr)
            self.send_json({'energy': energy})
        else:
            self.send_json({'error': 'No values provided'}, 400)
    
    def api_precomputed(self):
        """Return pre-computed data."""
        # Generate fresh each time for now (could cache)
        data = generate_precomputed_data()
        self.send_json(data)
    
    def api_magic_squares_4x4(self):
        """Return all 4x4 magic squares from JSON file."""
        try:
            # Get the parent directory (magicGem) and look for data folder
            web_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(web_dir)
            data_file = os.path.join(parent_dir, 'data', 'magic_squares_4x4.json')
            
            with open(data_file, 'r') as f:
                data = json.load(f)
            
            self.send_json(data)
        except FileNotFoundError:
            self.send_json({'error': 'Data file not found', 'path': data_file}, 404)
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def send_json(self, data, status=200):
        """Send JSON response."""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

def run_server():
    """Run the development server."""
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MagicGemsHandler) as httpd:
        print(f"\n{'='*60}")
        print(f"Magic Gems Web Server")
        print(f"{'='*60}")
        print(f"\nServing at: http://localhost:{PORT}")
        print(f"Open this URL in your browser to view the app.\n")
        print("Press Ctrl+C to stop the server.\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run_server()
