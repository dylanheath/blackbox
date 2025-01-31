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

# Start the Node.js server
echo "Starting Node.js server..."
node index.js