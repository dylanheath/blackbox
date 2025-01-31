# Blackbox Chat Application

A modern chat interface powered by the DeepSeek R1 language model through Ollama, featuring a React frontend and Node.js proxy server.

## Features

- Real-time streaming chat responses
- Clean, modern user interface
- Service status monitoring
- Automatic reconnection handling
- CORS-enabled proxy server
- Streaming response processing

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
- DeepSeek R1 7B model pulled via Ollama

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

3. Make sure Ollama is installed and the DeepSeek R1 model is pulled:
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
- Model: deepseek-r1:7b

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