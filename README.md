
<div align="center">

# Blackbox

A powerful, privacy-focused AI interface for running large language models locally through Ollama.

[Features](#features) • [Why Local AI?](#why-local-ai) • [Getting Started](#getting-started) • [Contributing](#contributing)

</div>

## Why Blackbox?

Blackbox is your gateway to running sophisticated AI models locally with complete privacy and control. Built for developers and AI enthusiasts who want the power of large language models without compromising on privacy or dealing with API costs.

### Why Local AI?

**Complete Privacy**
- Your data never leaves your machine
- Full control over model execution
- No internet dependency after model download

**Cost Effective**
- No usage costs or API fees
- Run unlimited queries
- Scale without worrying about billing

**High Performance**
- Low latency responses
- Customizable model configurations
- Optimized for your hardware

## Features

- Real-time streaming chat responses
- Clean, modern user interface
- Service status monitoring
- Automatic reconnection handling
- CORS-enabled proxy server
- Streaming response processing
- Support for any Ollama-compatible language model

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- [Ollama](https://ollama.ai) installed locally
- DeepSeek R1 7B model pulled via Ollama

### Project Structure

```
├── blackbox/          # React frontend application
├── proxy/             # Node.js proxy server
└── start.sh           # Startup script
```

### Development Setup

1. Clone the repository
```bash
git clone https://github.com/dylanheath/blackbox.git
cd blackbox
```

2. Install dependencies
```bash
# Install frontend dependencies
cd blackbox
npm install

# Install proxy server dependencies
cd ../proxy
npm install
```

3. Start development servers
```bash
# Start both frontend and proxy server
./start.sh
```

### Configuration

#### Frontend
- Default development port: 5173 (Vite default)
- Proxy server endpoint: http://localhost:8000

## Contributing

We love contributions! Whether it's fixing bugs, adding features, or improving documentation, your help makes Blackbox better for everyone.

### Ways to Contribute

- Report bugs and issues
- Suggest new features or improvements
- Improve documentation
- Submit pull requests
- Enhance UI/UX
- Optimize performance

### Development Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Guidelines

- Follow the existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Keep pull requests focused and atomic

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Powered by [Ollama](https://ollama.ai)
- UI components styled with CSS

---

<div align="center">
Made by Dylan Heathcote
</div>
