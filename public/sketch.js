//The Book of And
//August 2025
//Savannah Perry

// reference sketch: AUTHENICATED-OPENAI-CHAT-GPT from class
// based on a sketch by Jeremie Wenger p5.GPT https://github.com/jchwenger/p5.GPT/tree/master

// Create connection to Node.JS Server
const socket = io();
let connected = false;
let isLoading = false; // Add loading state variable

// Initialize variables

// HTML elements
//input DOM elements
let inputMessage;   // Input message input box //'.inputMessage'
let messageArea;    // Messages area // '.messages'
let systemPrompt;
let numTokens;
let tokensLabel;

// ===== ADD THESE NEW VARIABLES HERE =====
// Memory system variables
let conversationHistory = []; // Store the full conversation
let lastGeneratedText = ""; // Store just the last response
let maxHistoryLength = 3; // Keep last 3 exchanges for context
// ===== END NEW VARIABLES =====

//declare individual system prompts
// ===== REPLACE YOUR EXISTING PROMPTS WITH THESE IMPROVED ONES =====
let sprompt1 = "The protagonist crosses a threshold into a new space. Describe the tactile sensation of the doorway, the change in air pressure, temperature, or acoustics. What do their hands touch? What do their feet feel? Include one architectural impossibility that suggests this structure defies normal geometry.";

let sprompt2 = "The protagonist discovers something unexpected embedded in the walls, floor, or ceiling of this space. Begin with their eyes catching a small detail, then reveal its larger significance. This object or marking suggests someone else has been here before. End with a realization about the nature of this place.";

let sprompt3 = "The protagonist notices patterns repeating throughout this space - in the wallpaper, tile work, or shadows. These patterns seem to shift when not directly observed. Include the protagonist's growing awareness that these motifs might be a form of communication or navigation system within the structure.";

let sprompt4 = "A sudden change in lighting transforms how the protagonist perceives this space. Perhaps a window appears where none existed, or existing light sources change color or intensity. This illumination reveals architectural details previously hidden and suggests the building itself is somehow alive or responsive.";

let sprompt5 = "Time behaves strangely in this space. The protagonist experiences temporal displacement - hearing echoes of conversations from other eras, seeing glimpses of the room as it was or will be. Include sensory details from at least two time periods simultaneously. The architecture itself seems to be a palimpsest of different ages.";

let sprompt6 = "The protagonist hears sounds suggesting other inhabitants of this infinite structure - footsteps above, voices through walls, or the distant operation of machinery. Use varied sentence rhythms to mirror the sounds described. Include one moment of profound silence that makes the protagonist question what they're truly hearing.";

let sprompt7 = "The protagonist finds a staircase, corridor, or passage that seems to lead impossibly upward, downward, or in directions that shouldn't exist. As they begin to traverse it, describe how their sense of orientation becomes confused. The passage itself seems to be writing them into a new chapter of the structure.";

let sprompt8 = "The protagonist realizes that their path through the building is somehow connected to paths taken by others - perhaps they find evidence of previous travelers, or the rooms seem to be responding to their emotional state. Use metaphor to suggest the building is reading them as much as they are reading it.";

let sprompt9 = "The space the protagonist now occupies shows subtle signs of continuous change - walls that seem slightly different than moments before, furniture that has shifted position, or new passages that weren't there previously. Begin and end with parallel descriptions that show how even language itself shifts within this living labyrinth.";
// ===== END PROMPT REPLACEMENTS =====

//declare array of system prompts
let systemPrompts =[sprompt1,sprompt2,sprompt3,sprompt4,sprompt5,sprompt6,sprompt7,sprompt8,sprompt9];

let direction;

//going to store which text field we listen to
let currentPrompt = 0;

function setup() {
  noCanvas();

  messageArea = select(".messages");
  inputMessage = select("#input-message");
  systemPrompt = select("#system-prompt");
  numTokens = select("#num-tokens");
  tokensLabel = select("#tokens-label");

  //listen for slider value changes
  numTokens.input(tokensInput);

  // Add button event listeners
  console.log("Setting up navigation buttons...");
  
  // Wait a bit for DOM to be ready
  setTimeout(() => {
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    
    console.log("Previous button:", prevButton);
    console.log("Next button:", nextButton);

    if (prevButton) {
      console.log("Adding event listener to previous button");
      prevButton.addEventListener('click', () => {
        console.log("Previous button clicked!");
        if (!isLoading) { // Prevent multiple clicks while loading
          showLoadingMessage(); // Show loading immediately
          sendMessage("backward");
        }
      });
    } else {
      console.error("Previous button not found!");
    }

    if (nextButton) {
      console.log("Adding event listener to next button");
      nextButton.addEventListener('click', () => {
        console.log("Next button clicked!");
        if (!isLoading) { // Prevent multiple clicks while loading
          showLoadingMessage(); // Show loading immediately
          sendMessage("forward");
        }
      });
    } else {
      console.error("Next button not found!");
    }
  }, 100);

  sendMessage();
}

function tokensInput(){
  tokensLabel.elt.innerHTML = numTokens.value();
}

// NEW: Function to show loading message immediately
function showLoadingMessage() {
  isLoading = true;
  let messageArea = select(".messages");
  messageArea.html(""); // Clear previous message

  let messageDiv = createDiv("");
  messageDiv.parent(messageArea);
  messageDiv.addClass("message");
  messageDiv.addClass("loading"); // Add loading class for styling

  let userNameSpan = createSpan("entry: ");
  userNameSpan.parent(messageDiv);
  userNameSpan.addClass("username");

  let messageBodySpan = createSpan("loading...");
  messageBodySpan.parent(messageDiv);
  messageBodySpan.addClass("messageBody");
  messageBodySpan.addClass("loading-text"); // Add loading text class

  // Scroll to bottom
  messageArea.elt.parentElement.scrollTop = messageArea.elt.parentElement.scrollHeight;
}

// ===== REPLACE YOUR ENTIRE sendMessage FUNCTION WITH THIS ONE =====
// Sends a chat message
function sendMessage(direction){
  // ===== THIS IS THE KEY CHANGE - BUILD CONTEXT FROM PREVIOUS RESPONSE =====
  let prompt = "";
  
  // Build prompt with previous context
  if (lastGeneratedText) {
    prompt = `Previous passage: "${lastGeneratedText}"\n\nContinue the story seamlessly from where it left off.`;
  } else {
    prompt = "Begin a new story.";
  }
  // ===== END KEY CHANGE =====

  console.log("Sending prompt with context:", prompt);

  //if system prompt has no text in it just say "be helpful" by default
  let system_prompt = (systemPrompt.value() === "")? "Be helpful" : systemPrompt.value();
  let tokens = numTokens.value();
  console.log(system_prompt, tokens);

  // Prevent markup from being injected into the message
  prompt = cleanInput(prompt);
  // if there is a non-empty message and a socket connection
  if (connected) {
    inputMessage.value('');
    // tell server to execute 'chat' and send along parameters
    //if 'forward' go to next prompt
   if (direction === "forward"){
    currentPrompt = (currentPrompt + 1) % systemPrompts.length;
   }
   //if back go back a prompt
   if (direction === "backward"){
    currentPrompt = (currentPrompt - 1 + systemPrompts.length) % systemPrompts.length;
   }
   //make sure current prompt does not excede index list length
   currentPrompt = currentPrompt%systemPrompts.length;
 
   let systemPrompt = systemPrompts[currentPrompt];

   // ===== ENHANCED CONTINUITY INSTRUCTIONS =====
   //in addition to each prompt
   //hold coninuity with the last prompt response
   systemPrompt += " Continue the narrative seamlessly, maintaining the same protagonist and spatial context.";
   systemPrompt += " The reader is physically moving through an impossible architectural space.";
   systemPrompt += " Each passage should feel like stepping into a new room or corridor of an infinite structure.";
   //limit the response to 30 words
   systemPrompt += " Write no more than 3 paragraphs.";
   //adjust language style
   systemPrompt += " Write in a style inspired by Borges, Calvino, or Danielewski.";
   systemPrompt += " Write as though you are narrating the reader through a space.";
   systemPrompt += " The architecture itself is alive, responsive, and self-writing.";
   systemPrompt += " The last sentence is always complete with punctuation at the end.";
   // ===== END ENHANCED INSTRUCTIONS =====
   
   let maxTokens = 300; //enough tokens for a full page
   
   // send page and direction updates to ghost sketch before 'chat' 
   //  so it can do stuff while waiting for chat to return or use the additional
   //  data if needed for any other purpose    
  socket.emit('page-turn', {
     _currentPromptIndex: currentPrompt, 
     _direction: direction
   });
   
   // Also emit the event that ghost sketch is listening for
   socket.emit('page-turn-update', {
     currentPromptIndex: currentPrompt, 
     direction: direction
   });
 
   // ===== UPDATED CHAT EMIT WITH CONTEXT =====
   socket.emit('chat', {
     _prompt: prompt,  // NOW THIS CONTAINS THE PREVIOUS STORY CONTEXT!
     _system_prompt: systemPrompt, 
     _max_tokens: maxTokens,
     _current_prompt: currentPrompt,
     _history: conversationHistory.slice(-maxHistoryLength) // Send recent history
   });
   // ===== END UPDATED EMIT =====
  }
}
// ===== END sendMessage REPLACEMENT =====

// Adds the visual chat message to the message list
function addChatMessage(data) {
  isLoading = false; // Reset loading state when message arrives
  let messageArea = select(".messages"); // Select message container

  messageArea.html("");

  let messageDiv = createDiv("");
  messageDiv.parent(messageArea);
  messageDiv.addClass("message");

  let userNameSpan = createSpan(data.username);
  userNameSpan.parent(messageDiv);
  userNameSpan.addClass("username");

  let messageBodySpan = createSpan();
  messageBodySpan.parent(messageDiv);
  messageBodySpan.addClass("messageBody");

  //apply typing effect
  typeEffect(messageBodySpan.elt, data.message);

  //message container scrolls to the bottom to show all content
  setTimeout(() => {
    messageArea.elt.parentElement.scrollTop = messageArea.elt.parentElement.scrollHeight;
  }, 100);
}

//chat GPT helped me figure out how to clear the previous message so it refreshes with every entry or 'page turn'
// and maintain typing effect
function typeEffect(element, text, speed = 30) { // typing speed
  element.innerHTML = ""; // Clear existing text
  
  // Ensure container height remains fixed during typing
  const messageContainer = document.getElementById('message-container');
  if (messageContainer) {
    messageContainer.style.height = '70vh';
  }
  
  let i = 0;

  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
      
      // Scroll to bottom as text is being typed to keep up with content
      const messageArea = element.closest('.message-scroll');
      if (messageArea && i % 20 === 0) { // Update scroll every 20 characters for performance
        messageArea.scrollTop = messageArea.scrollHeight;
      }
    } else {
      // Final scroll to bottom when typing is complete
      const messageArea = element.closest('.message-scroll');
      if (messageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
      }
    }
  }

  type();
}

// Prevents input from having injected markup
function cleanInput(input){
  //remove all html tags, so no one can mess with your layout
  let clean = input.replace( /(<([^>]+)>)/ig, '');
  return clean;
}

//Events we are listening for

//if button pressed sendMessage() 
function keyPressed(){
  if (keyCode === RIGHT && !isLoading) { // Prevent key presses while loading
    showLoadingMessage(); // Show loading immediately
    sendMessage("forward");
  }
  else if (keyCode === LEFT && !isLoading){  // Prevent key presses while loading
    showLoadingMessage(); // Show loading immediately
    sendMessage("backward");
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Connect to Node.JS Server
// Socket events

socket.on('connect', () => {
  connected = true;
  console.log('connected to the server');
});

socket.on('reconnect', () => {
  connected = true;
  console.log('you have recconnected');
});

// ===== REPLACE YOUR EXISTING 'new message' HANDLER WITH THIS ONE =====
// when server emits 'new message', update the chat body
socket.on('new message', (data) => {
  console.log("Received new message:", data);
  
  // ===== STORE THE RESPONSE FOR CONTINUITY =====
  // Store the generated text for continuity
  lastGeneratedText = data;
  
  // Add to conversation history
  conversationHistory.push({
    prompt: currentPrompt,
    response: data,
    timestamp: Date.now()
  });
  
  // Limit history size to prevent token overflow
  if (conversationHistory.length > maxHistoryLength * 2) {
    conversationHistory = conversationHistory.slice(-maxHistoryLength);
  }
  
  console.log("Updated conversation history:", conversationHistory);
  // ===== END STORAGE CODE =====
  
  let message = { username: "entry: ", message: data };
  addChatMessage(message);
});
// ===== END REPLACEMENT =====

// listen for updates from ghost sketch
socket.on('sketch-update', (data) => {
  console.log('Received update from other sketch:', data);
  // handle updates from the pepper's ghost sketch if needed
});

socket.on('disconnect', () => {
  connected = false;
  console.log('you have been disconnected');
});

/// Keyboard-only fullscreen controls
document.addEventListener('keydown', (e) => {
  // Press 'F' for fullscreen
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleFullscreen();
  }
  // Or press spacebar (optional alternative)
  else if (e.key === ' ') {
    e.preventDefault();
    toggleFullscreen();
  }
});

// Add the toggleFullscreen function if you don't already have it
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement.requestFullscreen().then(() => {
      console.log("Entered fullscreen mode");
    }).catch(err => {
      console.log("Error attempting to enable fullscreen:", err);
    });
  } else {
    // Exit fullscreen
    document.exitFullscreen().then(() => {
      console.log("Exited fullscreen mode");
    }).catch(err => {
      console.log("Error attempting to exit fullscreen:", err);
    });
  }
}