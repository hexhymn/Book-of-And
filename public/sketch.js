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

//structure prompts
let sprompt1 = "The protagonist opens a door or crosses a threshold into a new space. Describe its appearance.";

let sprompt2 = "The protagonist is in a new room.  They discover something unexpected embedded in the space. This object or marking suggests someone else has been here before. The protagonist gains insight from this discovery.";

let sprompt3 = "The protagonist interacts with the walls or has an internal observation of the walls of the room they are in. Include the protagonist's growing curiosity and desire to continue to explore and understand the space they have entered.";

let sprompt4 = "A window of any shape or size has been noticed. The protagonist looks out the window- describe what they see. This illumination reveals details previously hidden and suggests the building itself is even larger than anticipated.";

let sprompt5 = "The protagonist navigates and walks through a hallway. They experience temporal displacement - hearing impressions of other eras or futures. Include sensory details.";

let sprompt6 = "The protagonist hears sounds suggesting that something else is in the space. They encounter a new character.";

let sprompt7 = "The protagonist and new character continue to navigate the structure. As they begin to traverse it, they become heavily aware of a strange detail about the floor they are walking on.";

let sprompt8 = "The protagonist looks up at the ceiling. Anyone traveling with the protagonist will now have to go separate ways.";

let sprompt9 = "The protagonist finds a stairwell and either ascends a level in the space they are navigating. The protagonist sees a new threshold or door at the top.";

//declare array of system prompts
let systemPrompts =[sprompt1,sprompt2,sprompt3,sprompt4,sprompt5,sprompt6,sprompt7,sprompt8,sprompt9];

let direction;

//going to store which text field we listen to
let currentPrompt = 0;

//streaming variables
let isStreaming = false;
let streamingText = '';
let streamingElement = null;

let loadingTimeout; 


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
// Client-side modifications for streaming (add these to your existing code)

function showLoadingMessage() {
  isLoading = true;
  isStreaming = false;
  streamingText = '';
  
  let messageArea = select(".messages");
  messageArea.html(""); // Clear previous message

  let messageDiv = createDiv("");
  messageDiv.parent(messageArea);
  messageDiv.addClass("message");

  let userNameSpan = createSpan(" ");
  userNameSpan.parent(messageDiv);
  userNameSpan.addClass("username");

  let messageBodySpan = createSpan(""); // Start with empty content
  messageBodySpan.parent(messageDiv);
  messageBodySpan.addClass("messageBody");

  // Store reference for streaming
  streamingElement = messageBodySpan.elt;

  // Wait 800ms before showing "loading..." text
  loadingTimeout = setTimeout(() => {
    if (isLoading && !isStreaming) { // Only show if still loading and not streaming yet
      messageBodySpan.html("loading...");
      messageBodySpan.addClass("loading-text");
    }
  }, 800); // Adjust this delay as needed

  // Scroll to bottom
  messageArea.elt.parentElement.scrollTop = messageArea.elt.parentElement.scrollHeight;
}

// New function to handle streaming text display
function startStreamingDisplay() {
  // Clear the loading timeout since we're starting to stream
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }

  if (streamingElement) {
    streamingElement.innerHTML = "";
    streamingElement.classList.remove("loading-text");
    streamingElement.classList.add("streaming-text");
    
    // Update username to show it's generating
    const username = streamingElement.parentElement.querySelector('.username');
    if (username) {
      username.innerHTML = " ";
    }
  }
  isStreaming = true;
  isLoading = false;
}

function appendStreamingText(chunk) {
  if (streamingElement && isStreaming) {
    streamingText += chunk;
    streamingElement.innerHTML = streamingText;
    
    // Auto-scroll to keep up with new text
    const messageArea = streamingElement.closest('.message-scroll');
    if (messageArea) {
      messageArea.scrollTop = messageArea.scrollHeight;
    }
  }
}

function completeStreaming(fullText) {
  isStreaming = false;
  isLoading = false;
  
  if (streamingElement) {
    streamingElement.classList.remove("streaming-text");
    streamingElement.classList.add("complete-text");
    
    // Update username to final state
    const username = streamingElement.parentElement.querySelector('.username');
    if (username) {
      username.innerHTML = direction === "backward" ? " " : " ";
    }
    
    // Ensure final text is complete
    streamingElement.innerHTML = fullText;
    
    // Final scroll
    const messageArea = streamingElement.closest('.message-scroll');
    if (messageArea) {
      setTimeout(() => {
        messageArea.scrollTop = messageArea.scrollHeight;
      }, 100);
    }
  }
  
  // IMPORTANT: Include all the memory system logic from your original handler
  console.log("Stream complete - updating memory system");
  
  // Always update the current text (whether new or regenerated)
  lastGeneratedText = fullText;
  
  // Only add to history if it's a forward movement (new content)
  // Regenerated content replaces the current moment
  if (direction !== "backward") {
    conversationHistory.push({
      prompt: currentPrompt,
      response: fullText,
      timestamp: Date.now(),
      direction: direction || 'forward'
    });
    
    // Limit history size to prevent token overflow
    if (conversationHistory.length > maxHistoryLength * 2) {
      conversationHistory = conversationHistory.slice(-maxHistoryLength);
    }
  }
  
  console.log("Updated conversation history:", conversationHistory);
}

// Add new socket event listeners (add these to your existing socket events)

// When streaming starts
socket.on('stream-start', () => {
  console.log('Stream starting...');
  startStreamingDisplay();
});

// When each chunk arrives
socket.on('stream-chunk', (data) => {
  console.log('Received chunk:', data.chunk);
  appendStreamingText(data.chunk);
});

// When streaming completes
socket.on('stream-complete', (data) => {
  console.log('Stream complete:', data.fullText);
  completeStreaming(data.fullText);
});

// Handle streaming errors
socket.on('stream-error', (errorMessage) => {
  console.error('Streaming error:', errorMessage);
  isStreaming = false;
  isLoading = false;
  
  if (streamingElement) {
    streamingElement.innerHTML = errorMessage;
    streamingElement.classList.remove("loading-text", "streaming-text");
    streamingElement.classList.add("error-text");
  }
});

// Remove or comment out your old 'new message' handler since we're now using streaming
/*
socket.on('new message', (data) => {
  // This is now handled by the streaming events above
});
*/

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
    systemPrompt += " You are a writer writing a novel about a character traversing a tower."; 
    systemPrompt += " write in the second person.";
    systemPrompt += " Use concise language.";
    systemPrompt += " Write no more than 3 paragraphs.";
    systemPrompt += " Write in a style that is literary and incorporates elements of magical realism.";
    systemPrompt += " Write as though you are narrating the reader through an architectural space.";
    systemPrompt += "Include architectural details and descriptive imagery and sensation of the structures and spaces the protagonist moves through.";
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

// // Enhanced message handler with memory system and regeneration support
// socket.on('new message', (data) => {
//   console.log("Received new message:", data);
  
//   // Always update the current text (whether new or regenerated)
//   lastGeneratedText = data;
  
//   // Only add to history if it's a forward movement (new content)
//   // Regenerated content replaces the current moment
//   if (direction !== "backward") {
//     conversationHistory.push({
//       prompt: currentPrompt,
//       response: data,
//       timestamp: Date.now(),
//       direction: direction || 'forward'
//     });
    
//     // Limit history size to prevent token overflow
//     if (conversationHistory.length > maxHistoryLength * 2) {
//       conversationHistory = conversationHistory.slice(-maxHistoryLength);
//     }
//   }
  
//   console.log("Updated conversation history:", conversationHistory);
  
//   let message = { 
//     username: direction === "backward" ? "entry (retold): " : "entry: ", 
//     message: data 
//   };
//   addChatMessage(message);
// });

// listen for updates from ghost sketch
socket.on('sketch-update', (data) => {
  console.log('Received update from other sketch:', data);
  // handle updates from the pepper's ghost sketch if needed
});

socket.on('disconnect', () => {
  connected = false;
  console.log('you have been disconnected');
  
  // Add reconnection logic:
  setTimeout(() => {
      if (!connected) {
          socket.connect(); // Attempt reconnection
          console.log('Main sketch attempting reconnection...');
          
          // You might also want to update the UI to show reconnection status
          if (isLoading) {
              // Reset loading state if we were in the middle of something
              isLoading = false;
              isStreaming = false;
          }
      }
  }, 5000);
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