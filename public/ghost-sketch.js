console.log("Ghost sketch loading...");

// ===== PARTICLE CLASS =====
// ===== PARTICLE CLASS =====
// ===== OPTIMIZED PARTICLE CLASS =====
class WordParticle {
  constructor(word, x, y) {
    this.word = word.toLowerCase();
    this.x = x;
    this.y = y;
    this.vx = random(-0.5, 0.5); // Reduced movement
    this.vy = random(-0.5, 0.5);
    this.size = random(3, 8);
    this.baseSize = this.size;
    this.alpha = 255;
    this.life = 1000;
    // make the decay of some particles more exaggerated (some live longer than others)
    //  by using the wordcount from the main particle system
    //  to affect some values of each particle in a consistent way
    //  (set once at creation and doesn't change with each update)
    this.decay = random(0.1, (particleSystem.totalWordCount * 0.05));
    this.connections = [];
    this.isNew = true;
    this.age = 0;
    this.maxAge = 120;
    
    // Simplified twinkle
    this.twinkleOffset = random(1000);
    this.twinkleSpeed = random(0.02, 0.05); // Slower for smoother animation
    
    // Circular boundary properties
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.maxRadius = min(width, height) / 2 - 10; // Leave some padding
  }
  
  update() {
    // use the wordcount from the main particle system
    //  to affect some values on each particle every update
    const randomness = particleSystem.totalWordCount * 0.015;
    this.age++;
    
    // make x & y positions a bit random each update - so they are jittery
    this.x += (this.vx + random(-randomness, randomness));
    this.y += (this.vy + random(-randomness, randomness));
    
    // Circular boundary constraint
    let distanceFromCenter = dist(this.x, this.y, this.centerX, this.centerY);
    
    if (distanceFromCenter > this.maxRadius) {
      // Calculate angle from center to particle
      let angle = atan2(this.y - this.centerY, this.x - this.centerX);
      
      // Place particle at the boundary
      this.x = this.centerX + cos(angle) * this.maxRadius;
      this.y = this.centerY + sin(angle) * this.maxRadius;
      
      // Reflect velocity (bounce off the circular boundary)
      // Calculate normal vector at boundary point
      let normalX = cos(angle);
      let normalY = sin(angle);
      
      // Reflect velocity vector off the normal
      let dotProduct = this.vx * normalX + this.vy * normalY;
      this.vx = this.vx - 2 * dotProduct * normalX;
      this.vy = this.vy - 2 * dotProduct * normalY;
      
      // Add some damping to prevent particles from getting too energetic
      this.vx *= 0.8;
      this.vy *= 0.8;
    }
    
    //matrix to symbolize letters in the alphabet
    this.life -= this.decay;
    this.alpha = this.life;
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    if (this.isNew && this.age > this.maxAge) {
      this.isNew = false;
    }
  }
  
  display() {
    // Simpler twinkle
    let twinkle = sin(frameCount * this.twinkleSpeed + this.twinkleOffset) * 0.3 + 0.7;
    let twinkleAlpha = this.alpha * twinkle;
    let twinkleSize = this.baseSize * twinkle;
    
    // Limited connections
    if (this.connections.length > 0) {
      stroke(140, 80);
      strokeWeight(0.5);
      
      // Only draw first 2 connections
      for (let i = 0; i < Math.min(2, this.connections.length); i++) {
        let connected = this.connections[i];
        line(this.x, this.y, connected.x, connected.y);
      }
    }
    
    // Main particle
    noStroke();
    fill(255, 255, 255, twinkleAlpha);
    circle(this.x, this.y, twinkleSize);
  }
  
  isDead() {
    return this.life <= 0;
  }
  
  findConnections(allParticles) {
    // Only check last 50 particles
    let recentParticles = allParticles.slice(-50);
    
    for (let other of recentParticles) {
      if (other !== this && this.word === other.word && this.connections.length < 3) {
        if (!this.connections.includes(other)) {
          this.connections.push(other);
          other.connections.push(this);
        }
      }
    }
  }
}

//PARTICLE SYSTEM CLASS
class WordParticleSystem {
  constructor() {
    this.particles = [];
    this.totalWordCount = 0;
  }
  
  addWord(word, x, y) {
    // Skip very short words
    if (word.length < 3) return;
    
    // Ensure the particle starts within the circular boundary
    let centerX = width / 2;
    let centerY = height / 2;
    let maxRadius = min(width, height) / 2 - 10;
    
    let distanceFromCenter = dist(x, y, centerX, centerY);
    if (distanceFromCenter > maxRadius) {
      // If outside circle, place at a random position within the circle
      let angle = random(TWO_PI);
      let radius = random(maxRadius * 0.7); // Keep away from edges initially
      x = centerX + cos(angle) * radius;
      y = centerY + sin(angle) * radius;
    }
    
    let particle = new WordParticle(word, x, y);
    this.particles.push(particle);
    this.totalWordCount++;
    
    // Find connections after adding
    particle.findConnections(this.particles);
    
    // Limit total particles for performance
    if (this.particles.length > 2000) {
      this.particles.splice(0, 100);
    }
    
    return particle;
  }
  
  addTextExplosion(text, x, y) {
    let words = text.match(/\b\w+\b/g) || [];
    
    // Ensure explosion center is within circular boundary
    let centerX = width / 2;
    let centerY = height / 2;
    let maxRadius = min(width, height) / 2 - 50; // Leave more room for explosion spread
    
    let distanceFromCenter = dist(x, y, centerX, centerY);
    if (distanceFromCenter > maxRadius) {
      let angle = atan2(y - centerY, x - centerX);
      x = centerX + cos(angle) * maxRadius;
      y = centerY + sin(angle) * maxRadius;
    }
    
    for (let word of words) {
      if (word.length >= 3) {
        // Spread particles around the point, but keep within circular boundary
        let angle = random(TWO_PI);
        let distance = random(10, 40);
        let wordX = x + cos(angle) * distance;
        let wordY = y + sin(angle) * distance;
        
        // The addWord method will handle circular boundary constraints
        this.addWord(word, wordX, wordY);
      }
    }
  }
  
  // do something in response to the page turn
  handlePageTurn() {
    // Remove oldest (index 0) particles if there are more than one
    if (this.particles.length > 1) {
      let particle = this.particles[0];
      // Remove from connections
      for (let connected of particle.connections) {
        let index = connected.connections.indexOf(particle);
        if (index > -1) {
          connected.connections.splice(index, 1);
        }
      }
      this.particles.splice(0, 1);
    }    
  }
  
  update() {
    // Update all particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let particle = this.particles[i];
      particle.update();
      
      // Remove dead particles
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
  }
  
  display() {
    // Optional: Draw the circular boundary for reference
    // stroke(255, 50);
    // strokeWeight(1);
    // noFill();
    // circle(width/2, height/2, min(width, height) - 20);
    
    // Draw connections first
    stroke(255, 60);
    strokeWeight(0.5);
    for (let particle of this.particles) {
      for (let connected of particle.connections) {
        let distance = dist(particle.x, particle.y, connected.x, connected.y);
        if (distance < 60) { // Only draw close connections
          line(particle.x, particle.y, connected.x, connected.y);
        }
      }
    }
    
    // Draw particles
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
//   textAlign(LEFT);
//   textSize(16);
//   text('Words: ' + particleSystem.getTotalWordCount(), 20, 30);
//   text('Particles: ' + particleSystem.getParticleCount(), 20, 50);
  
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
    
    // Create explosion of words at random position within circular boundary
    let centerX = width / 2;
    let centerY = height / 2;
    let maxRadius = min(width, height) / 2 - 60; // Leave room for explosion spread
    
    let angle = random(TWO_PI);
    let radius = random(maxRadius * 0.5); // Keep explosions more toward center
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius;
    
    particleSystem.addTextExplosion(data.content, x, y);
    
    // Send acknowledgment back to main sketch
    socket.emit('sketch-sync', {
      type: 'ghost-received',
      promptIndex: data.promptIndex,
      totalWords: particleSystem.getTotalWordCount()
    });
  }
});

socket.on('page-turn-update', (data) => {
  console.log('Ghost sketch received page turn update:', data);
  particleSystem.handlePageTurn(data);
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