//Credit: Inspiration from Jeremie Wenger: https://github.com/jchwenger/p5.GPT 

//OpenAI 
const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // This is the default and can be omitted on your local machine
});

// Remove the open requirement since it's not needed on Glitch
// const open = require("open");//only needed for a simple development tool remove if hosting online 

// Setup basic express server
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 4444; // Use Glitch's port or fallback to 4444

// Tell our Node.js Server to host our P5.JS sketch from the public folder.
app.use(express.static("public"));

// Route for main app
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route for ghost app
app.get('/ghost', (req, res) => {
  res.sendFile(__dirname + '/public/ghost.html');
});

// Setup Our Node.js server to listen at that port.
server.listen(port, '0.0.0.0', () => {
  console.log('Listening at port %d', port);
  // Remove open() call since it's not needed on Glitch
  // open(`http://localhost:${port}`);//opens in your default browser
});

io.on('connection', (socket) => {
  console.log("a user connected");
  socket.emit("start");

  // when the client emits 'new message', this listens and executes
  socket.on('chat', (data) => {
    console.log(data);
    console.log('making request');

    //request text and then handle the returned response
    requestText(data._prompt, data._system_prompt, data._max_tokens)
      .then((response) => {
        console.log(response.choices); 
        const answer = response.choices[0].message.content; //default to one response (mostly to keep costs down!)
        io.emit('new message', answer);
        
        // NEW: Broadcast text data to other sketch
        io.emit('book-data', {
          type: 'new-text',
          content: answer,
          promptIndex: data._current_prompt || 0,
          timestamp: Date.now()
        });
      })
      .catch((e) => {
        io.emit('new message', "oops something went wrong");
        console.error(e);
      });
  });

  // NEW: Handler for custom data between sketches
  socket.on('sketch-sync', (data) => {
    console.log('Syncing data between sketches:', data);
    // Broadcast to all other clients
    socket.broadcast.emit('sketch-update', data);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    console.log("a user disconnected");
  });
});

//asynchronous function which will return results once they are ready
async function requestText(_prompt, _system_prompt, _max_tokens = 20) {
  console.log(_prompt, _system_prompt, _max_tokens);

  return await openai.chat.completions.create({
    messages: [
      { 
        role: "developer", 
        content: [
          {
            "type": "text",
            "text": _system_prompt 
          }
        ]
      },
      { 
        role: "user", 
        content: [
          {
            "type": "text",
            "text": _prompt
          }
        ]
      }
    ],
    max_completion_tokens: _max_tokens,
    model: "gpt-4o-mini",
    n:1 //defaults to one response generated, but you can change it here
  });
}