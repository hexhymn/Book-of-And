console.log("Ghost sketch loading...");

// ===== PARTICLE CLASS =====
// ===== PARTICLE CLASS =====
// ===== OPTIMIZED PARTICLE CLASS =====
// Enhanced WordParticle class with organic entrance animations
class WordParticle {
  constructor(word, x, y) {
    this.word = word.toLowerCase();
    this.targetX = x;
    this.targetY = y;
    
    // Start particles off-screen or at center and animate to position
    this.spawnMode = random(['fade', 'spiral', 'drift', 'pulse']);
    
    if (this.spawnMode === 'spiral') {
      // Spiral in from center
      this.x = width / 2;
      this.y = height / 2;
      this.spiralAngle = random(TWO_PI);
      this.spiralRadius = random(200, 400);
    } else if (this.spawnMode === 'drift') {
      // Drift in from edges
      let edge = floor(random(4));
      if (edge === 0) { // top
        this.x = random(width);
        this.y = -50;
      } else if (edge === 1) { // right
        this.x = width + 50;
        this.y = random(height);
      } else if (edge === 2) { // bottom
        this.x = random(width);
        this.y = height + 50;
      } else { // left
        this.x = -50;
        this.y = random(height);
      }
    } else {
      // Fade or pulse start at target position
      this.x = x;
      this.y = y;
    }
    
    this.vx = 0;
    this.vy = 0;
    this.size = random(3, 8);
    this.baseSize = this.size;
    this.alpha = 0; // Start invisible
    this.life = 1000;
    this.decay = random(0.1, 0.3);
    this.connections = [];
    this.isNew = true;
    this.age = 0;
    this.maxAge = 120;
    
    // Animation properties
    this.animationProgress = 0;
    this.animationSpeed = random(0.02, 0.06);
    this.isFullySpawned = false;
    this.spawnDuration = random(60, 120); // frames to fully spawn
    
    // Organic movement properties
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
    this.driftSpeed = random(0.005, 0.015);
    
    // Twinkle
    this.twinkleOffset = random(1000);
    this.twinkleSpeed = random(0.02, 0.05);
    
    // Pulse properties for pulse spawn mode
    this.pulsePhase = random(TWO_PI);
    this.pulseSpeed = random(0.1, 0.3);
  }
  
  update() {
    this.age++;
    
    // Handle spawning animation
    if (!this.isFullySpawned) {
      this.animationProgress += this.animationSpeed;
      
      if (this.spawnMode === 'fade') {
        // Simple fade in
        this.alpha = this.animationProgress * 255;
        this.size = this.baseSize * this.animationProgress;
        
      } else if (this.spawnMode === 'spiral') {
        // Spiral in from center
        let progress = this.animationProgress;
        this.spiralRadius *= 0.95; // Spiral inward
        this.spiralAngle += 0.2;
        
        this.x = width/2 + cos(this.spiralAngle) * this.spiralRadius * (1 - progress);
        this.y = height/2 + sin(this.spiralAngle) * this.spiralRadius * (1 - progress);
        
        // Interpolate to target position
        this.x = lerp(this.x, this.targetX, progress * 0.1);
        this.y = lerp(this.y, this.targetY, progress * 0.1);
        
        this.alpha = progress * 255;
        this.size = this.baseSize * progress;
        
      } else if (this.spawnMode === 'drift') {
        // Drift from edges with easing
        let progress = this.ease(this.animationProgress);
        this.x = lerp(this.x, this.targetX, progress * 0.08);
        this.y = lerp(this.y, this.targetY, progress * 0.08);
        
        this.alpha = progress * 255;
        this.size = this.baseSize * progress;
        
        // Add some organic drift
        this.x += sin(this.age * 0.05) * 0.5;
        this.y += cos(this.age * 0.03) * 0.3;
        
      } else if (this.spawnMode === 'pulse') {
        // Pulse in with wave
        let progress = this.animationProgress;
        let pulse = sin(this.age * this.pulseSpeed + this.pulsePhase);
        
        this.alpha = progress * 255;
        this.size = this.baseSize * progress * (0.8 + pulse * 0.2);
      }
      
      if (this.animationProgress >= 1.0) {
        this.isFullySpawned = true;
        this.alpha = 255;
        this.size = this.baseSize;
      }
    } else {
      // Normal behavior after spawning
      // Organic floating movement using noise
      let noiseX = noise(this.noiseOffsetX + this.age * this.driftSpeed) - 0.5;
      let noiseY = noise(this.noiseOffsetY + this.age * this.driftSpeed) - 0.5;
      
      this.vx = noiseX * 0.8;
      this.vy = noiseY * 0.8;
      
      this.x += this.vx;
      this.y += this.vy;
      
      // Gentle drift toward center to prevent particles from wandering off
      let centerPull = 0.001;
      this.vx += (width/2 - this.x) * centerPull;
      this.vy += (height/2 - this.y) * centerPull;
      
      // Life decay
      this.life -= this.decay;
      this.alpha = this.life;
    }
    
    if (this.isNew && this.age > this.maxAge) {
      this.isNew = false;
    }
  }
  
  // Easing function for smoother animation
  ease(t) {
    return t * t * (3 - 2 * t); // Smoothstep
  }
  
  display() {
    if (this.alpha <= 0) return;
    
    // Enhanced twinkle that's more subtle during spawn
    let twinkleIntensity = this.isFullySpawned ? 0.3 : 0.1;
    let twinkle = sin(frameCount * this.twinkleSpeed + this.twinkleOffset) * twinkleIntensity + (1 - twinkleIntensity);
    let twinkleAlpha = this.alpha * twinkle;
    let twinkleSize = this.size * twinkle;
    
    // Draw connections with organic opacity
    if (this.connections.length > 0 && this.isFullySpawned) {
      stroke(140, twinkleAlpha * 0.3);
      strokeWeight(0.5);
      
      for (let i = 0; i < Math.min(2, this.connections.length); i++) {
        let connected = this.connections[i];
        if (connected.isFullySpawned) {
          line(this.x, this.y, connected.x, connected.y);
        }
      }
    }
    
    // Main particle with soft glow effect
    noStroke();
    
    // Outer glow
    fill(255, 255, 255, twinkleAlpha * 0.1);
    circle(this.x, this.y, twinkleSize * 2);
    
    // Main particle
    fill(255, 255, 255, twinkleAlpha);
    circle(this.x, this.y, twinkleSize);
    
    // Inner bright core
    fill(255, 255, 255, twinkleAlpha * 0.8);
    circle(this.x, this.y, twinkleSize * 0.4);
  }
  
  isDead() {
    return this.life <= 0;
  }
  
  findConnections(allParticles) {
    if (!this.isFullySpawned) return; // Don't connect until fully spawned
    
    let recentParticles = allParticles.slice(-50);
    
    for (let other of recentParticles) {
      if (other !== this && other.isFullySpawned && this.word === other.word && this.connections.length < 3) {
        if (!this.connections.includes(other)) {
          this.connections.push(other);
          other.connections.push(this);
        }
      }
    }
  }
}

//Enhanced WordParticleSystem with staggered spawning
class WordParticleSystem {
  constructor() {
    this.particles = [];
    this.totalWordCount = 0;
    this.spawnQueue = []; // Queue for staggered spawning
  }
  
  addWord(word, x, y, delay = 0) {
    if (word.length < 3) return;
    
    // Add to spawn queue with delay
    this.spawnQueue.push({
      word: word,
      x: x,
      y: y,
      spawnTime: frameCount + delay
    });
    
    this.totalWordCount++;
  }
  
  addTextExplosion(text, x, y) {
    let words = text.match(/\b\w+\b/g) || [];
    
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      if (word.length >= 3) {
        // Spread particles around the point
        let angle = random(TWO_PI);
        let distance = random(20, 60);
        let wordX = x + cos(angle) * distance;
        let wordY = y + sin(angle) * distance;
        
        // Keep within canvas bounds
        wordX = constrain(wordX, 50, width - 50);
        wordY = constrain(wordY, 50, height - 50);
        
        // Stagger spawn times
        let delay = i * random(5, 15); // Random delay between words
        this.addWord(word, wordX, wordY, delay);
      }
    }
  }
  
  update() {
    // Process spawn queue
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      let spawn = this.spawnQueue[i];
      if (frameCount >= spawn.spawnTime) {
        let particle = new WordParticle(spawn.word, spawn.x, spawn.y);
        this.particles.push(particle);
        
        // Find connections after adding
        particle.findConnections(this.particles);
        
        this.spawnQueue.splice(i, 1);
      }
    }
    
    // Update all particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let particle = this.particles[i];
      particle.update();
      
      if (particle.isDead()) {
        // Remove from connections
        for (let connected of particle.connections) {
          let index = connected.connections.indexOf(particle);
          if (index > -1) {
            connected.connections.splice(index, 1);
          }
        }
        this.particles.splice(i, 1);
      }
    }
    
    // Limit total particles for performance
    if (this.particles.length > 2000) {
      this.particles.splice(0, 100);
    }
  }
  
  display() {
    // Draw particles (connections are drawn within each particle)
    for (let particle of this.particles) {
      particle.display();
    }
  }
  
  getParticleCount() {
    return this.particles.length;
  }
  
  getTotalWordCount() {
    return this.totalWordCount;
  }
}

// ===== MAIN SKETCH =====
console.log("Setting up global variables...");

// Connect to the same server
const socket = io();
let connected = false;
let particleSystem;
let currentText = "";

function setup() {
  createCanvas(600, 600);
  console.log("Canvas created");
  
  particleSystem = new WordParticleSystem();
  console.log("Particle system created");
}

function draw() {
background(0, 30); // Trail effect
  
  // Draw stats
  fill(255, 150);
  //check word count and particle count
  // textAlign(LEFT);
  // textSize(16);
  // text('Words: ' + particleSystem.getTotalWordCount(), 20, 30);
  // text('Particles: ' + particleSystem.getParticleCount(), 20, 50);
  
  // Update and display particle system
  particleSystem.update();
  particleSystem.display();
}

// Socket events
socket.on('connect', () => {
  connected = true;
  console.log('Word web visualization connected to server');
});

socket.on('book-data', (data) => {
  console.log('Ghost sketch received book data:', data);
  
  if (data.type === 'new-text') {
    currentText = data.content;
    
    // Create explosion of words at random position
    let x = random(100, width - 100);
    let y = random(100, height - 100);
    particleSystem.addTextExplosion(data.content, x, y);
    
    // Send acknowledgment back to main sketch
    socket.emit('sketch-sync', {
      type: 'ghost-received',
      promptIndex: data.promptIndex,
      totalWords: particleSystem.getTotalWordCount()
    });
  }
});

socket.on('disconnect', () => {
  connected = false;
  console.log('Word web visualization disconnected');
});

console.log("Ghost sketch setup complete");

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let fs = fullscreen();
    fullscreen(!fs);
  }

    }