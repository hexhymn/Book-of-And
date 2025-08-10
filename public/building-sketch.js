// Global variables
let tileImages = {}; // Object to hold your PNG tile images (not array!)
let tiles = [];
let tileColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#f1c40f'
];
let canvasWidth = 800;
let canvasHeight = 600;
let time = 0; // Global time variable for sine animations

// Circle constraint properties
let centerX, centerY;
let circleRadius;

// WebSocket connection
let socket;
let connected = false;

// Track which keywords have been used
let usedKeywords = [];

// Keyword groups - multiple keywords map to the same tile type
let keywordGroups = {
    'stair': ['stair', 'stairs', 'staircase', 'threshold'],
    'door': ['door', 'doorway', 'entrance'],
    'window': ['window', 'opening'],
    'floor': ['floor', 'ground'],
    'wall': ['wall', 'walls'],
    'ceiling': ['ceiling'],
    'hallway': ['hallway', 'corridor', 'passage'],
    'room': ['room', 'chamber', 'space']
};

// Flatten all keywords into a single array for detection
let keywords = [];
for (let tileType in keywordGroups) {
    keywords = keywords.concat(keywordGroups[tileType]);
}

// Preload tile images
function preload() {
    // Load your keyword-specific PNG files
    tileImages['stair'] = loadImage('tiles/lab-stair.png');
    tileImages['door'] = loadImage('tiles/lab-door1.png');
    tileImages['window'] = loadImage('tiles/lab-stair2.png');
    tileImages['floor'] = loadImage('tiles/lab-floor1.png');
    tileImages['wall'] = loadImage('tiles/lab-wall1.png');
    tileImages['ceiling'] = loadImage('tiles/lab-ceiling1.png');
    tileImages['hallway'] = loadImage('tiles/lab-stair3.png');
    tileImages['threshold'] = loadImage('tiles/lab-stair4.png');
    tileImages['room'] = loadImage('tiles/lab-room1.png');
    // Add any additional default tiles
    tileImages['default'] = loadImage('tiles/lab-stair.png');
    // tileImages['default2'] = loadImage('tiles/tile2.png');
}

function setup() {
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('sketch-container');

    frameRate(30);
    
    // Set up circle constraints
    centerX = canvasWidth / 2;
    centerY = canvasHeight / 2;
    circleRadius = min(canvasWidth, canvasHeight) * 0.4; // 40% of smaller dimension
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Initialize with 1 starting tile
    addTileToArray('default');
}

function draw() {
    background(0);
    
    // Draw the circular boundary (optional - for visualization)
    stroke(255);
    strokeWeight(1);
    noFill();
    ellipse(centerX, centerY, circleRadius * 2, circleRadius * 2);
    
    // Increment time for sine animations
    time += 0.02;

    // Reset used keywords periodically to prevent infinite accumulation
    if (frameCount % 1800 === 0) { // Every ~30 seconds at 60fps
        usedKeywords = usedKeywords.slice(-50); // Keep only recent 50
        console.log('Cleaned usedKeywords array, now has:', usedKeywords.length, 'items');
    }
    
    // Draw connection lines first (so they appear behind tiles)
    stroke(255, 255, 255, 80);
    strokeWeight(1);
    for (let tile of tiles) {
        if (tile.parentTile) {
            line(tile.x, tile.y, tile.parentTile.x, tile.parentTile.y);
        }
    }
    
    // Draw all tiles with sine-based animations
    for (let i = 0; i < tiles.length; i++) {
        let tile = tiles[i];
        
        // Calculate animated properties using sine waves
        let sizeMultiplier = 1 + sin(time + tile.phaseOffset) * tile.sizeAmplitude;
        let animatedSize = tile.baseSize * sizeMultiplier;
        
        // Depth effect - tiles can "float" up and down
        let depthOffset = sin(time * 0.7 + tile.depthPhase) * tile.depthRange;
        let animatedY = tile.y + depthOffset;
        
        // Subtle rotation for extra movement
        let rotation = sin(time * 0.5 + tile.rotationPhase) * tile.rotationRange;
        
        // Opacity pulsing for breathing effect
        let opacity = 0.7 + sin(time * 1.2 + tile.opacityPhase) * 0.3;
        
        if (tile.tileKey && tileImages[tile.tileKey]) {
            // Use specific keyword tile image
            let img = tileImages[tile.tileKey];
            push();
            translate(tile.x, animatedY);
            rotate(rotation);
            
            // Apply opacity
            tint(255, opacity * 255);
            
            imageMode(CENTER);
            image(img, 0, 0, animatedSize, animatedSize);
            
            // Remove tint for next tile
            noTint();
            pop();
        }
        // Remove the else clause - no fallback diamonds!
    }
}

function addTileToArray(tileType = 'default') {
    let newTile;
    
    if (tiles.length === 0) {
        // First tile - place in center
        newTile = {
            x: centerX,
            y: centerY,
            color: random(tileColors),
            tileKey: tileType,
            baseSize: random(40, 60),
            // Sine animation properties
            phaseOffset: random(TWO_PI),
            sizeAmplitude: random(0.1, 0.3),
            depthPhase: random(TWO_PI),
            depthRange: random(5, 15),
            rotationPhase: random(TWO_PI),
            rotationRange: random(0.05, 0.15),
            opacityPhase: random(TWO_PI)
        };
    } else {
        // Connect to the last generated tile (linear connection)
        let parentTile = tiles[tiles.length - 1];
        let connectionDistance = (parentTile.baseSize + random(40, 70)) / 2;
        
        // Try multiple times to find a valid position within the circle
        let newX, newY;
        let attempts = 0;
        let maxAttempts = 50;
        
        do {
            // Choose a random direction (8 possible directions for isometric feel)
            let angles = [0, PI/4, PI/2, 3*PI/4, PI, 5*PI/4, 3*PI/2, 7*PI/4];
            let angle = random(angles);
            
            newX = parentTile.x + cos(angle) * connectionDistance;
            newY = parentTile.y + sin(angle) * connectionDistance;
            
            attempts++;
            
            // If we can't find a good spot, try shorter connection distance
            if (attempts > maxAttempts / 2) {
                connectionDistance *= 0.8;
                attempts = 0;
            }
            
        } while (dist(newX, newY, centerX, centerY) > circleRadius - 30 && attempts < maxAttempts);
        
        // If still outside after all attempts, place closer to center
        if (dist(newX, newY, centerX, centerY) > circleRadius - 30) {
            let angleToCenter = atan2(centerY - parentTile.y, centerX - parentTile.x);
            newX = parentTile.x + cos(angleToCenter) * connectionDistance * 0.5;
            newY = parentTile.y + sin(angleToCenter) * connectionDistance * 0.5;
        }
        
        newTile = {
            x: newX,
            y: newY,
            color: random(tileColors),
            tileKey: tileType,
            baseSize: random(30, 60),
            parentTile: parentTile,
            // Sine animation properties
            phaseOffset: random(TWO_PI),
            sizeAmplitude: random(0.1, 0.3),
            depthPhase: random(TWO_PI),
            depthRange: random(5, 15),
            rotationPhase: random(TWO_PI),
            rotationRange: random(0.05, 0.15),
            opacityPhase: random(TWO_PI)
        };
    }
    
    tiles.push(newTile);

    if (tiles.length > 100) {
        tiles.splice(0, 20); // Remove oldest 20 tiles
      }

    console.log(`Added tile: ${tileType} at (${newTile.x.toFixed(1)}, ${newTile.y.toFixed(1)})`);
}

function addRandomTile() {
    addTileToArray('default');
}

// WebSocket initialization and event handlers
function initializeWebSocket() {
    // Connect to the same server as your text sketch
    socket = io();
    
    socket.on('connect', () => {
        connected = true;
        console.log('Tile sketch connected to server');
    });
    
    socket.on('disconnect', () => {
        connected = false;
        console.log('Tile sketch disconnected from server');
        
        // Add reconnection logic:
        setTimeout(() => {
            if (!connected) {
                socket.connect(); // Attempt reconnection
                console.log('Tile sketch attempting reconnection...');
            }
        }, 5000);
    });
    
    // Listen for text generation events
    socket.on('book-data', (data) => {
        if (data.type === 'new-text') {
            console.log('Received new text:', data.content);
            processTextForKeywords(data.content);
        }
    });
    
    // Listen for streaming chunks to detect keywords in real-time
    socket.on('stream-chunk', (data) => {
        // Don't process chunks - wait for complete text to avoid duplicates
        // processTextForKeywords(data.chunk);
    });
    
    // Listen for complete text
    socket.on('stream-complete', (data) => {
        console.log('Full text received:', data.fullText);
        processTextForKeywords(data.fullText);
    });
}

// Function to analyze text and add tiles based on keywords
function processTextForKeywords(text) {
    if (!text) return;
    
    let lowerText = text.toLowerCase();
    
    // Check for each keyword
    for (let keyword of keywords) {
        if (lowerText.includes(keyword) && !usedKeywords.includes(keyword)) {
            console.log(`Found keyword: ${keyword}`);
            
            // Find which tile type this keyword belongs to
            let tileType = 'default';
            for (let type in keywordGroups) {
                if (keywordGroups[type].includes(keyword)) {
                    tileType = type;
                    break;
                }
            }
            
            addTileToArray(tileType);
            usedKeywords.push(keyword);
            
            // Only add one tile per text chunk
            break;
        }
    }
}

// Function to reset used keywords (useful for testing)
function resetKeywords() {
    usedKeywords = [];
    console.log('Reset used keywords');
}

// Function to clear all tiles and start fresh
function clearAllTiles() {
    tiles = [];
    usedKeywords = [];
    addTileToArray('default');
    console.log('Cleared all tiles and reset');
}

function drawAnimatedIsometricTile(x, y, tileColor, size, rotation, opacity) {
    push();
    translate(x, y);
    rotate(rotation);
    
    // Apply opacity to colors
    let baseColor = color(tileColor);
    let r = red(baseColor);
    let g = green(baseColor);
    let b = blue(baseColor);
    
    // Create isometric diamond shape
    fill(r, g, b, opacity * 255);
    stroke(255, 255, 255, opacity * 150);
    strokeWeight(2);
    
    beginShape();
    vertex(0, -size/2);      // Top
    vertex(size/2, 0);       // Right
    vertex(0, size/2);       // Bottom
    vertex(-size/2, 0);      // Left
    endShape(CLOSE);
    
    // Add some shading for depth
    fill(r * 0.7, g * 0.7, b * 0.7, opacity * 255);
    noStroke();
    
    beginShape();
    vertex(0, -size/2);      // Top
    vertex(size/2, 0);       // Right
    vertex(0, 0);            // Center
    vertex(-size/2, 0);      // Left
    endShape(CLOSE);
    
    // Add highlight
    fill(255, 255, 255, opacity * 60);
    beginShape();
    vertex(0, -size/2);      // Top
    vertex(0, 0);            // Center
    vertex(-size/2, 0);      // Left
    endShape(CLOSE);
    
    pop();
}

// Optional: Click anywhere to add a tile at that position (within circle)
function mousePressed() {
    // Check if click is within the circle
    if (dist(mouseX, mouseY, centerX, centerY) <= circleRadius - 30) {
        let newTile = {
            x: mouseX,
            y: mouseY,
            color: random(tileColors),
            tileKey: 'default',
            baseSize: random(30, 60),
            // Sine animation properties
            phaseOffset: random(TWO_PI),
            sizeAmplitude: random(0.1, 0.3),
            depthPhase: random(TWO_PI),
            depthRange: random(5, 15),
            rotationPhase: random(TWO_PI),
            rotationRange: random(0.05, 0.15),
            opacityPhase: random(TWO_PI)
        };
        tiles.push(newTile);
    }
}

// Keyboard shortcut: press 'r' to reset with 1 new tile
function keyPressed() {
    if (key === 'r' || key === 'R') {
        clearAllTiles();
    }
    // Press 'k' to reset keywords without clearing tiles
    else if (key === 'k' || key === 'K') {
        resetKeywords();
    }
    // Press 't' to test by adding a random keyword tile
    else if (key === 't' || key === 'T') {
        let randomKeyword = random(keywords);
        addTileToArray(randomKeyword);
        console.log(`Test: Added ${randomKeyword} tile`);
    }
}