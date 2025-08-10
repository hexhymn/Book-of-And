// Global variables
let tileImages = []; // Array to hold your PNG tile images
let tiles = [];
let tileColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#f1c40f'
];
let canvasWidth = 800;
let canvasHeight = 600;
let time = 0; // Global time variable for sine animations

// WebSocket connection
let socket;
let connected = false;

// Keyword to tile mapping
let keywordTileMap = {
    'stair': 'stair.png',
    'stairs': 'stair.png',
    'door': 'door.png',
    'window': 'window.png',
    'floor': 'floor.png',
    'wall': 'wall.png',
    'ceiling': 'ceiling.png',
    'hallway': 'hallway.png',
    'threshold': 'threshold.png',
    'room': 'room.png'
};

// Track which keywords have been used
let usedKeywords = [];

// Preload your tile images here
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
    // tileImages['default1'] = loadImage('tiles/tile1.png');
    // tileImages['default2'] = loadImage('tiles/tile2.png');
}

function setup() {
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('sketch-container');
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Initialize with 1 starting tile
    addTileToArray('default');
}

function draw() {
    background(0);
    
    // Increment time for sine animations
    time += 0.02;
    
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
        
        if (tileImages.length > 0) {
            // Use actual PNG images when loaded
            let img = tileImages[tile.imageIndex];
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
        } else {
            // Fallback to colored diamonds with sine effects
            drawAnimatedIsometricTile(tile.x, animatedY, tile.color, animatedSize, rotation, opacity);
        }
    }
}

function addTileToArray(tileType = 'default') {
    let newTile;
    
    if (tiles.length === 0) {
        // First tile - place in center
        newTile = {
            x: canvasWidth / 2,
            y: canvasHeight / 2,
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
        
        // Choose a random direction (8 possible directions for isometric feel)
        let angles = [0, PI/4, PI/2, 3*PI/4, PI, 5*PI/4, 3*PI/2, 7*PI/4];
        let angle = random(angles);
        
        let newX = parentTile.x + cos(angle) * connectionDistance;
        let newY = parentTile.y + sin(angle) * connectionDistance;
        
        // Keep tiles within canvas bounds
        newX = constrain(newX, 50, canvasWidth - 50);
        newY = constrain(newY, 50, canvasHeight - 50);
        
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
    console.log(`Added tile: ${tileType}`);
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
        if (data.chunk) {
            processTextForKeywords(data.chunk);
        }
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
    for (let keyword in keywordTileMap) {
        if (lowerText.includes(keyword) && !usedKeywords.includes(keyword)) {
            console.log(`Found keyword: ${keyword}`);
            addTileToArray(keyword);
            usedKeywords.push(keyword);
            
            // Optional: Add a small delay between tile additions
            // if multiple keywords are found
            break; // Only add one tile per text chunk
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

// Optional: Click anywhere to add a tile at that position
function mousePressed() {
    if (mouseX >= 0 && mouseX <= canvasWidth && mouseY >= 0 && mouseY <= canvasHeight) {
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
        let keywords = Object.keys(keywordTileMap);
        let randomKeyword = random(keywords);
        addTileToArray(randomKeyword);
        console.log(`Test: Added ${randomKeyword} tile`);
    }
}