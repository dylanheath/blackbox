#!/bin/bash

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags >/dev/null; then
    echo "Starting Ollama service..."
    ollama serve &
    sleep 5  # Wait for Ollama to initialize
fi

# Check if the model is available
if ! curl -s http://localhost:11434/api/tags | grep -q "deepseek-r1:7b"; then
    echo "Pulling DeepSeek R1 model..."
    ollama pull deepseek-r1:7b
fi

# Start the Node.js proxy server in the background
echo "Starting Node.js proxy server..."
cd "$(dirname "$0")/proxy" && node index.js &

# Wait a moment for the proxy server to start
sleep 2

# Start the frontend development server
echo "Starting frontend application..."
cd "$(dirname "$0")/blackbox" && npm run dev &

# Wait for both servers to be ready
sleep 3

echo "\nBlackbox is ready!"
echo "Frontend: http://localhost:5173"
echo "Proxy Server: http://localhost:8000"

# Keep the script running
wait