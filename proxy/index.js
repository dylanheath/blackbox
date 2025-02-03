// Import required modules
import http from 'http';
import fetch from 'node-fetch';

// Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = 'deepseek-r1:7b';
const PORT = process.env.PORT || 8000;

// Handle streaming responses from Ollama
async function handleOllamaStream(req, res) {
    try {
        // Parse and validate the request body
        const { prompt } = JSON.parse(req.body);
        if (!prompt || typeof prompt !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid prompt: A non-empty string is required.' }));
            return;
        }

        // Parse model parameters from request
        const { model = MODEL, temperature = 0.7, maxTokens, systemPrompt } = JSON.parse(req.body);

        // Configure and send request to Ollama
        const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ],
                stream: true,
                options: {
                    temperature: temperature,
                    ...(maxTokens && { num_predict: maxTokens })
                }
            })
        });

        // Handle Ollama API errors
        if (!ollamaResponse.ok) {
            res.writeHead(ollamaResponse.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Ollama API Error: ${ollamaResponse.statusText}` }));
            return;
        }

        // Stream the response back to the client
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        for await (const chunk of ollamaResponse.body) {
            res.write(chunk);
        }
        res.end();

    } catch (error) {
        console.error('Server Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

// Create and configure the HTTP server
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Handle status check endpoint
    if (req.method === 'GET' && req.url === '/api/status') {
        try {
            const response = await fetch(`${OLLAMA_HOST}/api/tags`);
            if (response.ok) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'running' }));
            } else {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Ollama service not responding' }));
            }
        } catch (error) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Unable to connect to Ollama service' }));
        }
        return;
    }

    // Only process POST requests to /api/generate
    if (req.method === 'POST' && req.url === '/api/generate') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            req.body = body;
            handleOllamaStream(req, res);
        });
        console.log(body)
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
    console.log(`Proxying requests to Ollama at ${OLLAMA_HOST}`);
});