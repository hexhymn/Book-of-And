//Credit: based on a sketch by Jeremie Wenger: https://github.com/jchwenger/p5.GPT 

// Server.js modifications for streaming

const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 4444;

app.use(express.static("public"));

app.get('/health', (req, res) => {
  console.log('Health check accessed');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/ghost', (req, res) => {
  res.sendFile(__dirname + '/public/ghost.html');
});

app.get('/lab', (req, res) => {
  res.sendFile(__dirname + '/public/lab.html');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});

io.on('connection', (socket) => {
  console.log("a user connected");
  socket.emit("start");

  // Modified chat handler for streaming
  socket.on('chat', (data) => {
    console.log('Starting streaming request');
    
    // Emit streaming start event
    socket.emit('stream-start');
    
    // Call streaming function
    streamText(socket, data._prompt, data._system_prompt, data._max_tokens, data._current_prompt || 0);
  });

  socket.on('sketch-sync', (data) => {
    console.log('Syncing data between sketches:', data);
    socket.broadcast.emit('sketch-update', data);
  });

  socket.on('disconnect', () => {
    console.log("a user disconnected");
  });
});

// New streaming function
async function streamText(socket, _prompt, _system_prompt, _max_tokens = 300, promptIndex) {
  try {
    console.log('Creating streaming completion...');
    
    const stream = await openai.chat.completions.create({
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
      model: "gpt-4.1-mini",
      stream: true, // Enable streaming
      n: 1
    });

    let fullResponse = '';
    
    // Process each chunk as it arrives
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        fullResponse += content;
        
        // Send to requesting client
        socket.emit('stream-chunk', {
          chunk: content,
          fullText: fullResponse
        });
        
        // BROADCAST to ALL clients (including tile sketch)
        io.emit('stream-chunk', {
          chunk: content,
          fullText: fullResponse
        });
      }
    }

    
    
    // Signal that streaming is complete
    socket.emit('stream-complete', {
      fullText: fullResponse,
      promptIndex: promptIndex
    });
    
    // Also emit to other sketches
    io.emit('book-data', {
      type: 'new-text',
      content: fullResponse,
      promptIndex: promptIndex,
      timestamp: Date.now()
    });
    
    console.log('Streaming completed');
    
  } catch (error) {
    console.error('Streaming error:', error);
    socket.emit('stream-error', 'Sorry, something went wrong with the text generation.');
  }
}