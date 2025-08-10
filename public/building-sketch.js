// Enhanced tile sketch with better connection debugging and event handling

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
let connectionStatus = "Disconnected";

// Enhanced keyword to tile mapping
let keywordTileMap = {
    'stair': 'stair',
    'stairs': 'stair',
    'stairwell': 'stair',
    'door': 'door',
    'doors': 'door',
    'window': 'window',
    'windows': 'window',
    'floor': 'floor',
    'floors': 'floor',
    'wall': 'wall',
    'walls': 'wall',
    'ceiling': 'ceiling',
    'ceilings': 'ceiling',
    'hallway': 'hallway',
    'hallways': 'hallway',
    'corridor': 'hallway',
    'threshold': 'threshold',
    'thresholds': 'threshold',
    'room': 'room',
    'rooms': 'room',
    'chamber': 'room',
    'space': 'room'
};

// Track which keywords have been used and debugging info
let usedKeywords = [];
let debugMessages = [];
let lastReceivedText = "";
let totalChunksReceived = 0;

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
    
    console.log("Tile images loaded");
}

function setup() {
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('sketch-container');
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Initialize with 1 starting tile
    addTileToArray('default');
    
    // Add debugging info
    addDebugMessage("Tile sketch initialized");
}

function draw() {
    background(52, 73, 94);
    
    // Increment time for sine animations
    time += 0.02;
    
    // Draw connection status and debug info
    drawDebugInfo();
    
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
        
        // Draw tile based on type
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
        } else {
            // Fallback to colored diamonds with sine effects
            drawAnimatedIsometricTile(tile.x, animatedY, tile.color, animatedSize, rotation, opacity);
        }
    }
}

function drawDebugInfo() {
    // Connection status
    fill(connected ? color(46, 204, 113) : color(231, 76, 60));
    noStroke();
    ellipse(20, 20, 16, 16);
    
    fill(255);
    textSize(12);
    text(connectionStatus, 45, 25);
    
    // Stats
    text(`Tiles: ${tiles.length}`, 45, 45);
    text(`Keywords used: ${usedKeywords.length}`, 45, 65);
    text(`Chunks received: ${totalChunksReceived}`, 45, 85);
    
    // Recent debug messages (last 5)
    let recentMessages = debugMessages.slice(-5);
    for (let i = 0; i < recentMessages.length; i++) {
        fill(255, 200);
        text(recentMessages[i], 45, 105 + i * 15);
    }
    
    // Last received text preview (first 50 chars)
    if (lastReceivedText.length > 0) {
        fill(200, 255, 200);
        text("Last text: " + lastReceivedText.substring(0, 50) + "...", 45, 200);
    }
}

function addDebugMessage(message) {
    let timestamp = new Date().toLocaleTimeString();
    debugMessages.push(`${timestamp}: ${message}`);
    console.log(message);
    
    // Keep only last 20 messages
    if (debugMessages.length > 20) {
        debugMessages = debugMessages.slice(-20);
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
    addDebugMessage(`Added tile: ${tileType} (total: ${tiles.length})`);
}

// Enhanced WebSocket initialization with better error handling
function initializeWebSocket() {
    try {
        // Connect to the same server as your text sketch
        socket = io();
        
        socket.on('connect', () => {
            connected = true;
            connectionStatus = "Connected";
            addDebugMessage('Tile sketch connected to server');
            
            // Identify this sketch to the server
            socket.emit('identify-sketch', { type: 'tile' });
        });
        
        socket.on('disconnect', () => {
            connected = false;
            connectionStatus = "Disconnected";
            addDebugMessage('Tile sketch disconnected from server');
        });
        
        socket.on('reconnect', () => {
            connected = true;
            connectionStatus = "Reconnected";
            addDebugMessage('Tile sketch reconnected to server');
            
            // Re-identify after reconnection
            socket.emit('identify-sketch', { type: 'tile' });
        });
        
        // Listen for the book-data event (your original method)
        socket.on('book-data', (data) => {
            addDebugMessage(`Received book-data: ${data.type}`);
            
            if (data.type === 'new-text') {
                lastReceivedText = data.content;
                addDebugMessage(`Processing text: ${data.content.substring(0, 30)}...`);
                processTextForKeywords(data.content);
            }
        });
        
        // Listen for streaming chunks to detect keywords in real-time
        socket.on('stream-chunk', (data) => {
            totalChunksReceived++;
            
            if (data.chunk) {
                lastReceivedText += data.chunk;
                processTextForKeywords(data.chunk);
            }
        });
        
        // Enhanced: Listen for text chunks specifically formatted for tiles
        socket.on('text-chunk-for-tiles', (data) => {
            addDebugMessage(`Tile-specific chunk received`);
            
            if (data.chunk) {
                processTextForKeywords(data.chunk);
            }
        });
        
        // Listen for complete text
        socket.on('stream-complete', (data) => {
            addDebugMessage(`Stream complete - full text length: ${data.fullText.length}`);
            lastReceivedText = data.fullText;
            processTextForKeywords(data.fullText);
        });
        
        // Enhanced: Listen for tile-specific completion event
        socket.on('text-complete-for-tiles', (data) => {
            addDebugMessage(`Tile processing complete - words: ${data.wordCount}`);
            processTextForKeywords(data.fullText);
        });
        
        // Listen for page turn events
        socket.on('page-turn-event', (data) => {
            addDebugMessage(`Page turn: ${data.direction} (prompt ${data.currentPromptIndex})`);
            
            // You could add special behavior for page turns here
            // For example, add a special "transition" tile
            if (data.direction === 'forward') {
                addTileToArray('threshold');
            }
        });
        
        // Error handling
        socket.on('connect_error', (error) => {
            connectionStatus = "Connection Error";
            addDebugMessage(`Connection error: ${error.message}`);
        });
        
        socket.on('stream-error', (errorMessage) => {
            addDebugMessage(`Stream error: ${errorMessage}`);
        });
        
    } catch (error) {
        addDebugMessage(`WebSocket initialization error: ${error.message}`);
    }
}

// Enhanced function to analyze text and add tiles based on keywords
function processTextForKeywords(text) {
    if (!text) return;
    
    let lowerText = text.toLowerCase();
    let foundKeywords = [];
    
    // Check for each keyword
    for (let keyword in keywordTileMap) {
        if (lowerText.includes(keyword) && !usedKeywords.includes(keyword)) {
            foundKeywords.push(keyword);
            let tileType = keywordTileMap[keyword];
            
            addDebugMessage(`Found keyword: "${keyword}" -> tile: ${tileType}`);
            addTileToArray(tileType);
            usedKeywords.push(keyword);
        }
    }
    
    // If no specific keywords found but we have new text, add a default tile occasionally
    if (foundKeywords.length === 0 && text.length > 20 && random() < 0.3) {
        addTileToArray('default');
        addDebugMessage(`Added default tile for text length: ${text.length}`);
    }
}

// Function to reset used keywords (useful for testing)
function resetKeywords() {
    usedKeywords = [];
    addDebugMessage('Reset used keywords');
}

// Function to clear all tiles and start fresh
function clearAllTiles() {
    tiles = [];
    usedKeywords = [];
    debugMessages = [];
    lastReceivedText = "";
    totalChunksReceived = 0;
    addTileToArray('default');
    addDebugMessage('Cleared all tiles and reset');
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

// Enhanced mouse interaction with debugging
function mousePressed() {
    if (mouseX >= 0 && mouseX <= canvasWidth && mouseY >= 0 && mouseY <= canvasHeight) {
        // Test keyword detection
        let testKeywords = Object.keys(keywordTileMap);
        let randomKeyword = random(testKeywords);
        let tileType = keywordTileMap[randomKeyword];
        
        let newTile = {
            x: mouseX,
            y: mouseY,
            color: random(tileColors),
            tileKey: tileType,
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
        
        addDebugMessage(`Manual tile added: ${tileType} at (${mouseX}, ${mouseY})`);
    }
}

// Enhanced keyboard shortcuts
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
        let tileType = keywordTileMap[randomKeyword];
        addTileToArray(tileType);
        addDebugMessage(`Test: Added ${tileType} tile for keyword "${randomKeyword}"`);
    }
    // Press 'd' to toggle debug info visibility
    else if (key === 'd' || key === 'D') {
        // You can add a debug visibility toggle here if needed
        addDebugMessage('Debug info refresh');
    }
    // Press 'c' to test connection
    else if (key === 'c' || key === 'C') {
        if (socket && connected) {
            socket.emit('sketch-sync', { 
                type: 'tile-test', 
                message: 'Testing connection from tile sketch',
                timestamp: Date.now()
            });
            addDebugMessage('Sent test message to server');
        } else {
            addDebugMessage('Cannot test - not connected');
        }
    }
}