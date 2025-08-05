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

// Memory system variables
let conversationHistory = []; // Store the full conversation
let lastGeneratedText = ""; // Store just the last response
let maxHistoryLength = 3; // Keep last 3 exchanges for context

// Page regeneration system
let pageContexts = {}; // Store the context for each page so we can regenerate it
let currentPageKey = ""; // Track which page we're currently on

//declare individual system prompts - enhanced for spatial navigation
let sprompt1 = "The protagonist crosses a threshold into a new space. Describe tactile sensations, the change in air pressure, temperature, or acoustics. How does it engage with the senses?";

let sprompt2 = "The protagonist discovers something unexpected embedded in the space. This object or marking suggests someone else has been here before. The protagonist gains insight from this discovery.";

let sprompt3 = "The protagonist notices patterns repeating throughout this space - in the wallpaper, tile work, or shadows, etc. These patterns seem to shift when not directly observed. Include the protagonist's growing awareness that these motifs might be a form of communication or navigation system within the structure.";

let sprompt4 = "A sudden change transforms how the protagonist perceives this space. Perhaps a window appears where none existed, or existing light sources change color or intensity. This illumination reveals details previously hidden and suggests the building itself is somehow alive or responsive.";

let sprompt5 = "Time behaves strangely in this space. The protagonist experiences temporal displacement - hearing echoes of conversations from other eras, seeing glimpses of the room as it was or will be. Include sensory details from at least two time periods simultaneously. The architecture itself seems to be a palimpsest of different ages.";

let sprompt6 = "The protagonist hears sounds suggesting that something else is in the space - footsteps above, voices through walls, or the distant operation of machinery. Use varied sentence rhythms to mirror the sounds described. the protagonist investigates what they're truly hearing. They encounter a new character.";

let sprompt7 = "The protagonist and new character continue to navigate the structure that seems to lead impossibly upward, downward, or in directions that shouldn't exist. As they begin to traverse it, describe how their sense of orientation becomes confused.";

let sprompt8 = "The protagonist realizes that their path through the building is somehow connected to paths taken by others - perhaps they find evidence of previous travelers, or the rooms seem to be responding to their emotional state. Use metaphor to suggest the building is reading them as much as they are reading it. Anyone traveling with the protagonist will now have to go separate ways.";

let sprompt9 = "The space the protagonist now occupies shows subtle signs of continuous change - walls that seem slightly different than moments before, furniture that has shifted position, or new passages that weren't there previously. The protagonist finds a new threshold or door.";



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

// Function to show loading message immediately
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

function typeEffect(element, text, speed = 30) { // Original typing speed
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

// Enhanced sendMessage function with memory system and page regeneration
function sendMessage(direction) {
  let prompt = "";
  
  // Create a unique key for each page based on prompt and position in story
  let pageKey = `${currentPrompt}_${conversationHistory.length}`;
  
  if (direction === "backward" && lastGeneratedText) {
    // GOING BACKWARD: Regenerate the same page with different wording
    prompt = `Previous passage: "${lastGeneratedText}"\n\nRewrite this same scene with different language and phrasing, but keep the same events, spatial context, and story progression. Use varied sentence structures and different descriptive details while maintaining the same essential narrative moment.`;
    
    console.log("Regenerating current page with different wording");
    
  } else if (direction === "forward" && lastGeneratedText) {
    // GOING FORWARD: Continue the story normally
    prompt = `Previous passage: "${lastGeneratedText}"\n\nContinue the story seamlessly from where it left off.`;
    
    // Store the context for this new page
    pageKey = `${currentPrompt}_${conversationHistory.length}`;
    pageContexts[pageKey] = {
      previousText: lastGeneratedText,
      promptIndex: currentPrompt,
      timestamp: Date.now()
    };
    
  } else {
    // First page
    prompt = "Begin a new story.";
    pageContexts["0_0"] = {
      previousText: "",
      promptIndex: 0,
      timestamp: Date.now()
    };
  }

  console.log("Sending prompt with context:", prompt);
  console.log("Direction:", direction);
  console.log("Current page key:", pageKey);

  let system_prompt = (systemPrompt.value() === "") ? "Be helpful" : systemPrompt.value();
  let tokens = numTokens.value();

  // Prevent markup from being injected into the message
  prompt = cleanInput(prompt);
  
  if (connected) {
    inputMessage.value('');
    
    // Navigate prompts - but handle backward differently
    if (direction === "forward") {
      currentPrompt = (currentPrompt + 1) % systemPrompts.length;
    } else if (direction === "backward") {
      // Don't change currentPrompt - we're regenerating the same page
    }
    
    currentPrompt = currentPrompt % systemPrompts.length;
 
    let systemPrompt = systemPrompts[currentPrompt];
    
    // Different instructions based on direction
    if (direction === "backward") {
      systemPrompt += " Rewrite the same narrative moment with fresh language. Keep the same spatial context, character actions, and story progression, but use different descriptive words, sentence structures, and stylistic choices.";
      systemPrompt += " The same events occur, but the prose itself shifts like light changing in a room.";
    } else {
      systemPrompt += " Continue the narrative seamlessly, maintaining the same protagonist and spatial context.";
    }
    
    systemPrompt += " The reader is physically moving through an architectural space.";
   // systemPrompt += " Each passage should feel like stepping into a new room or corridor of an infinite structure.";
    systemPrompt += " Write no more than 3 paragraphs.";
    systemPrompt += " Write in a style that is literary, philosophical, and incorporates magical realism.";
    systemPrompt += " Write as though you are narrating the reader through a space.";
    systemPrompt += " The architecture itself is alive, responsive, and self-writing.";
    systemPrompt += " The last sentence is always complete with punctuation at the end.";
    
    let maxTokens = 300;
    
    // send page and direction updates to ghost sketch before 'chat' 
    socket.emit('page-turn', {
       _currentPromptIndex: currentPrompt, 
       _direction: direction
     });
     
     socket.emit('page-turn-update', {
       currentPromptIndex: currentPrompt, 
       direction: direction
     });
   
     socket.emit('chat', {
       _prompt: prompt,  // NOW THIS CONTAINS THE PREVIOUS STORY CONTEXT!
       _system_prompt: systemPrompt, 
       _max_tokens: maxTokens,
       _current_prompt: currentPrompt,
       _direction: direction,
       _is_regeneration: direction === "backward", // Flag for server
       _history: conversationHistory.slice(-maxHistoryLength) // Send recent history
     });
  }
}

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

  // Use your original typing effect
  typeEffect(messageBodySpan.elt, data.message);

  // Final scroll to bottom after a short delay
  setTimeout(() => {
    messageArea.elt.parentElement.scrollTop = messageArea.elt.parentElement.scrollHeight;
  }, 100);
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

// Enhanced message handler with memory system and regeneration support
socket.on('new message', (data) => {
  console.log("Received new message:", data);
  
  // Always update the current text (whether new or regenerated)
  lastGeneratedText = data;
  
  // Only add to history if it's a forward movement (new content)
  // Regenerated content replaces the current moment
  if (direction !== "backward") {
    conversationHistory.push({
      prompt: currentPrompt,
      response: data,
      timestamp: Date.now(),
      direction: direction || 'forward'
    });
    
    // Limit history size to prevent token overflow
    if (conversationHistory.length > maxHistoryLength * 2) {
      conversationHistory = conversationHistory.slice(-maxHistoryLength);
    }
  }
  
  console.log("Updated conversation history:", conversationHistory);
  
  let message = { 
    username: direction === "backward" ? "entry (retold): " : "entry: ", 
    message: data 
  };
  addChatMessage(message);
});

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