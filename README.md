<div style="background-color: #1a1f2c; color: rgba(255, 255, 255, 0.87); padding: 2rem; border-radius: 12px;">

# Blackbox

A local AI interface designed for running and interacting with AI models through Ollama on your own machine. Currently supporting the DeepSeek R1 language model (with more Ollama-compatible models coming soon), this application features a React frontend and Node.js proxy server for seamless local AI model execution.

## Why Local AI?

- Complete privacy and data control
- No internet dependency after model download
- No usage costs or API fees
- Customizable model configurations
- Full control over model execution environment

## Features

- Real-time streaming chat responses
- Clean, modern user interface
- Service status monitoring
- Automatic reconnection handling
- CORS-enabled proxy server
- Streaming response processing
- Support for any Ollama-compatible language model

## Project Structure

```
├── blackbox/          # React frontend application
├── proxy/             # Node.js proxy server
└── start.sh           # Startup script
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- [Ollama](https://ollama.ai) installed locally
- DeepSeek R1 7B model (or any other Ollama-compatible model) pulled via Ollama

## Setup

1. Clone the repository:
```bash
git clone [your-repository-url]
cd [repository-name]
```

2. Install dependencies for both the frontend and proxy server:
```bash
# Install proxy server dependencies
cd proxy
npm install

# Install frontend dependencies
cd ../blackbox
npm install
```

3. Make sure Ollama is installed and the DeepSeek R1 model (or your preferred model) is pulled:
```bash
ollama pull deepseek-r1:7b
```

## Running the Application

1. Start the application using the provided script:
```bash
./start.sh
```

This script will:
- Start the Ollama service if not running
- Pull the DeepSeek R1 model if not available
- Start the Node.js proxy server

2. In a separate terminal, start the frontend:
```bash
cd blackbox
npm run dev
```

3. Access the application at `http://localhost:5173`

## Configuration

### Proxy Server
- Default port: 8000 (configurable via PORT environment variable)
- Ollama host: http://localhost:11434 (configurable via OLLAMA_HOST environment variable)
- Model: deepseek-r1:7b (configurable to any Ollama-compatible model)

### Frontend
- Default development port: 5173 (Vite default)
- Proxy server endpoint: http://localhost:8000

## Development

### Frontend (blackbox/)
- Built with React + TypeScript
- Uses Vite as build tool
- Features real-time message streaming
- Includes service status monitoring

### Proxy Server (proxy/)
- Node.js server with CORS support
- Streams responses from Ollama
- Provides status endpoint for service health checks
- Handles error cases and reconnection logic

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

</div>

<style>
  /* Dark theme styles */
  body {
    background-color: #1a1f2c;
    color: rgba(255, 255, 255, 0.87);
  }
  
  a {
    color: #4299e1;
  }
  
  a:hover {
    color: #3182ce;
  }
  
  code {
    background-color: rgba(45, 55, 72, 0.8);
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }
  
  pre {
    background-color: rgba(45, 55, 72, 0.8);
    padding: 1em;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>