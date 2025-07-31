console.log("Architectural Ghost sketch loading...");

// ===== ARCHITECTURAL BLOCK CLASS =====
class ArchitecturalBlock {
  constructor(x, y, z, size, blockType) {
    this.x = x;
    this.y = y;
    this.z = z || 0;
    this.size = size;
    this.blockType = blockType; // 'stone', 'void', 'column', 'arch'
    this.age = 0;
    this.maxAge = random(200, 500);
    this.opacity = 255;
    this.connections = [];
    this.hasDecayed = false;
    this.decayRate = random(0.5, 2);
    this.noiseOffset = random(1000);
    
    // Architectural properties
    this.isStructural = random() < 0.3; // Some blocks are load-bearing
    this.erosionLevel = 0;
    this.maxErosion = random(50, 150);
  }
  
  update() {
    this.age++;
    
    // Gradual erosion using noise
    let erosionNoise = noise(this.x * 0.01, this.y * 0.01, frameCount * 0.001);
    if (erosionNoise > 0.6) {
      this.erosionLevel += this.decayRate;
    }
    
    // Structural decay
    if (this.erosionLevel > this.maxErosion) {
      this.hasDecayed = true;
      this.opacity = max(0, this.opacity - 3);
    }
    
    // Fade in new blocks
    if (this.age < 30) {
      this.opacity = map(this.age, 0, 30, 0, 255);
    }
  }
  
  display() {
    push();
    translate(this.x, this.y, this.z);
    
    // Different rendering based on block type
    switch(this.blockType) {
      case 'stone':
        this.drawStoneBlock();
        break;
      case 'void':
        this.drawVoid();
        break;
      case 'column':
        this.drawColumn();
        break;
      case 'arch':
        this.drawArch();
        break;
    }
    
    pop();
  }
  
  drawStoneBlock() {
    // Stone texture with erosion
    let erosionFactor = map(this.erosionLevel, 0, this.maxErosion, 1, 0.3);
    let blockSize = this.size * erosionFactor;
    
    // Multiple layers for depth
    for (let i = 0; i < 3; i++) {
      let layerSize = blockSize * (1 - i * 0.1);
      let layerAlpha = this.opacity * (1 - i * 0.2);
      
      fill(200 - i * 30, 180 - i * 20, 160 - i * 15, layerAlpha);
      noStroke();
      box(layerSize, layerSize, layerSize * 0.6);
    }
    
    // Weathering details
    if (this.erosionLevel > 20) {
      stroke(100, 50);
      strokeWeight(0.5);
      // Draw erosion lines
      for (let j = 0; j < 3; j++) {
        let lineY = random(-this.size/2, this.size/2);
        line(-this.size/2, lineY, this.size/2, lineY);
      }
    }
  }
  
  drawVoid() {
    // Negative space - draw outline only
    stroke(255, this.opacity * 0.3);
    strokeWeight(1);
    noFill();
    box(this.size);
  }
  
  drawColumn() {
    // Cylindrical column
    fill(220, 200, 180, this.opacity);
    noStroke();
    
    push();
    rotateX(HALF_PI);
    cylinder(this.size * 0.4, this.size * 1.5);
    pop();
    
    // Capital and base
    fill(240, 220, 200, this.opacity);
    translate(0, -this.size * 0.8, 0);
    box(this.size * 0.8, this.size * 0.2, this.size * 0.8);
    translate(0, this.size * 1.6, 0);
    box(this.size * 0.8, this.size * 0.2, this.size * 0.8);
  }
  
  drawArch() {
    // Simplified arch structure
    stroke(200, 180, 160, this.opacity);
    strokeWeight(3);
    noFill();
    
    // Arch curve
    beginShape();
    for (let angle = 0; angle < PI; angle += 0.1) {
      let x = cos(angle) * this.size * 0.5;
      let y = sin(angle) * this.size * 0.5;
      vertex(x, -y, 0);
    }
    endShape();
    
    // Supporting pillars
    line(-this.size * 0.5, 0, 0, -this.size * 0.5, this.size, 0);
    line(this.size * 0.5, 0, 0, this.size * 0.5, this.size, 0);
  }
  
  isDead() {
    return this.opacity <= 0;
  }
}

// ===== ARCHITECTURAL SYSTEM CLASS =====
class ArchitecturalSystem {
  constructor() {
    this.blocks = [];
    this.totalWordCount = 0;
    this.structureHeight = 0;
    this.gridSize = 30;
    this.centerX = 0;
    this.centerY = 0;
    this.buildingLayers = [];
    this.currentLayer = 0;
    
    // Initialize first layer
    this.buildingLayers.push(new Set());
  }
  
  addWord(word, x, y) {
    if (word.length < 3) return;
    
    // Convert word characteristics to architectural decisions
    let blockType = this.determineBlockType(word);
    let size = map(word.length, 3, 15, 15, 35);
    
    // Grid-based positioning for architectural coherence
    let gridX = Math.round(x / this.gridSize) * this.gridSize;
    let gridY = Math.round(y / this.gridSize) * this.gridSize;
    let gridZ = this.structureHeight;
    
    // Check if position is already occupied
    let positionKey = `${gridX},${gridY},${gridZ}`;
    if (this.buildingLayers[this.currentLayer].has(positionKey)) {
      // Find adjacent empty space
      let adjacent = this.findAdjacentSpace(gridX, gridY, gridZ);
      if (adjacent) {
        gridX = adjacent.x;
        gridY = adjacent.y;
        gridZ = adjacent.z;
        positionKey = `${gridX},${gridY},${gridZ}`;
      }
    }
    
    let block = new ArchitecturalBlock(gridX, gridY, gridZ, size, blockType);
    this.blocks.push(block);
    this.totalWordCount++;
    
    // Add to current layer
    this.buildingLayers[this.currentLayer].add(positionKey);
    
    // Check if we need a new layer
    if (this.buildingLayers[this.currentLayer].size > 20) {
      this.currentLayer++;
      this.structureHeight -= this.gridSize;
      this.buildingLayers.push(new Set());
    }
    
    // Limit total blocks
    if (this.blocks.length > 300) {
      this.blocks.splice(0, 50);
    }
    
    return block;
  }
  
  determineBlockType(word) {
    // Word characteristics determine architecture
    let vowels = (word.match(/[aeiou]/g) || []).length;
    let consonants = word.length - vowels;
    
    if (vowels > consonants) return 'void';
    if (word.length > 8) return 'column';
    if (word.includes('and') || word.includes('or')) return 'arch';
    return 'stone';
  }
  
  findAdjacentSpace(x, y, z) {
    let directions = [
      {x: this.gridSize, y: 0, z: 0},
      {x: -this.gridSize, y: 0, z: 0},
      {x: 0, y: this.gridSize, z: 0},
      {x: 0, y: -this.gridSize, z: 0},
      {x: 0, y: 0, z: -this.gridSize}
    ];
    
    for (let dir of directions) {
      let newX = x + dir.x;
      let newY = y + dir.y;
      let newZ = z + dir.z;
      let key = `${newX},${newY},${newZ}`;
      
      if (!this.buildingLayers[this.currentLayer].has(key)) {
        return {x: newX, y: newY, z: newZ};
      }
    }
    return null;
  }
  
  addTextExplosion(text, x, y) {
    let words = text.match(/\b\w+\b/g) || [];
    
    for (let word of words) {
      if (word.length >= 3) {
        // Architectural spread pattern
        let angle = random(TWO_PI);
        let distance = random(this.gridSize, this.gridSize * 3);
        let wordX = x + cos(angle) * distance;
        let wordY = y + sin(angle) * distance;
        
        // Keep within canvas bounds
        wordX = constrain(wordX, -width/2 + 50, width/2 - 50);
        wordY = constrain(wordY, -height/2 + 50, height/2 - 50);
        
        this.addWord(word, wordX, wordY);
      }
    }
  }
  
  update() {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      let block = this.blocks[i];
      block.update();
      
      if (block.isDead()) {
        this.blocks.splice(i, 1);
      }
    }
  }
  
  display() {
    // Set up 3D view
    push();
    translate(width/2, height/2, 0);
    
    // Slow rotation for better viewing
    rotateY(frameCount * 0.003);
    rotateX(-0.3);
    
    // Draw all blocks
    for (let block of this.blocks) {
      block.display();
    }
    
    // Draw connecting elements between nearby blocks
    this.drawConnections();
    
    pop();
  }
  
  drawConnections() {
    stroke(255, 30);
    strokeWeight(1);
    
    for (let i = 0; i < this.blocks.length; i++) {
      let block = this.blocks[i];
      
      // Find nearby blocks for connections
      for (let j = i + 1; j < this.blocks.length; j++) {
        let other = this.blocks[j];
        let distance = dist(block.x, block.y, block.z, other.x, other.y, other.z);
        
        if (distance < this.gridSize * 2 && distance > 0) {
          // Draw connecting lines (like structural supports)
          line(block.x, block.y, block.z, other.x, other.y, other.z);
        }
      }
    }
  }
  
  getBlockCount() {
    return this.blocks.length;
  }
  
  getTotalWordCount() {
    return this.totalWordCount;
  }
}

// ===== MAIN SKETCH =====
console.log("Setting up architectural visualization...");

const socket = io();
let connected = false;
let architecturalSystem;
let currentText = "";

function setup() {
  createCanvas(600, 600, WEBGL);
  console.log("3D Canvas created");
  
  architecturalSystem = new ArchitecturalSystem();
  console.log("Architectural system created");
}

function draw() {
  background(10, 15, 20); // Dark atmospheric background
  
  // Ambient lighting for 3D effect
  ambientLight(60, 60, 80);
  directionalLight(200, 200, 200, -1, 0.5, -1);
  
  // Update and display architectural system
  architecturalSystem.update();
  architecturalSystem.display();
  
  // Draw stats (in 2D overlay)
  camera();
  fill(255, 150);
  textAlign(LEFT);
  textSize(12);
  text('Blocks: ' + architecturalSystem.getBlockCount(), -width/2 + 20, -height/2 + 30);
  text('Words: ' + architecturalSystem.getTotalWordCount(), -width/2 + 20, -height/2 + 50);
}

// Socket events
socket.on('connect', () => {
  connected = true;
  console.log('Architectural visualization connected to server');
});

socket.on('book-data', (data) => {
  console.log('Architectural sketch received book data:', data);
  
  if (data.type === 'new-text') {
    currentText = data.content;
    
    // Create architectural expansion at center
    let x = random(-100, 100);
    let y = random(-100, 100);
    architecturalSystem.addTextExplosion(data.content, x, y);
    
    // Send acknowledgment back to main sketch
    socket.emit('sketch-sync', {
      type: 'architectural-received',
      promptIndex: data.promptIndex,
      totalWords: architecturalSystem.getTotalWordCount(),
      totalBlocks: architecturalSystem.getBlockCount()
    });
  }
});

socket.on('disconnect', () => {
  connected = false;
  console.log('Architectural visualization disconnected');
});

console.log("Architectural sketch setup complete");

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let fs = fullscreen();
    fullscreen(!fs);
  }
}