//The Book of And
//May 2025
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

//declare individual system prompts
let sprompt1 = "Write a paragraph about a moment of passage between spaces, focusing on sensory details and the subtle psychological shift that occurs when crossing thresholds. Include one unexpected detail that creates intrigue.";
let sprompt2 = "Describe in rich, atmospheric prose the moment of encountering something unexpected. Begin with a small detail before revealing the larger significance. End with a sentence that suggests deeper implications.";
let sprompt3 = "Write about someone noticing recurring motifs or symbols in their environment. Use metaphorical language to suggest these patterns hold meaning beyond coincidence. Include both visual and non-visual patterns.";
let sprompt4 = "Compose a passage about a sudden shift in perception that reveals something previously unseen. Use contrasting imagery before and after the shift. End with an insight or question that lingers.";
let sprompt5 = "Create a paragraph where temporal boundaries blur. Use sensory details to evoke at least two different time periods simultaneously. Include one reference to something ancient and one to something ephemeral.";
let sprompt6 = "Write about sounds or impressions that suggest other presences. Use varied sentence lengths with shorter sentences for immediate sounds and longer, flowing sentences for distant ones. Include one moment of silence among the echoes.";
let sprompt7 = "Describe how a change in light transforms a space and its occupant's perception. Begin in relative darkness and transition to illumination (or vice versa). Use color specifically and intentionally.";
let sprompt8 = "Craft a passage revealing how seemingly unrelated elements are interconnected. Begin with separate observations that gradually converge. Use one extended metaphor throughout that reinforces the theme of connection.";
let sprompt9 = "Write about subtle changes that suggest continuous flux. Focus on minute details that signal broader transformations. Begin and end with parallel structures that themselves show variation.";

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

// Sends a chat message
function sendMessage(direction){
  let prompt = inputMessage.value();
  console.log("HELLLOOOOOOO",prompt);

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

   //in addition to each prompt
   //hold coninuity with the last prompt response
   systemPrompt += " in continuity with the last response written, furthering plot, as though you are continuing to tell the next page of a story with each prompt";
   //limit the response to 30 words
   systemPrompt += " do not write more than 3 paragraphs";
   //adjust language style
   systemPrompt += " written in a style inspired by classic literature";
   systemPrompt += " written as though you are narrating the reader through a space";
   systemPrompt += " the last sentence is always complete with punctuation at the end";
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
 
   // NEW: Include current prompt index for ghost sketch
   socket.emit('chat', {
     _prompt: prompt, 
     _system_prompt: systemPrompt, 
     _max_tokens: maxTokens,
     _current_prompt: currentPrompt  // Add this line
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

// when server emits 'new message', update the chat body
socket.on('new message', (data) => {
  console.log(data);
  let message = { username: "entry: ", message: data };
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