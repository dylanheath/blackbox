import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
  timestamp: number
}

interface Settings {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

interface ServiceStatus {
  isConnected: boolean
  retryCount: number
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proxyStatus, setProxyStatus] = useState<ServiceStatus>({ isConnected: false, retryCount: 0 })
  const [modelStatus, setModelStatus] = useState<ServiceStatus>({ isConnected: false, retryCount: 0 })
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    model: 'deepseek-r1-7b',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI assistant.'
  })
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkServiceStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/status')
      const data = await response.json()
      
      if (response.ok && data.status === 'running') {
        setProxyStatus({ isConnected: true, retryCount: 0 })
        setModelStatus({ isConnected: true, retryCount: 0 })
        setError(null)
        setIsInitializing(false)
      } else {
        handleServiceError('model')
      }
    } catch (error) {
      handleServiceError('proxy')
    }
  }

  const handleServiceError = (service: 'proxy' | 'model') => {
    const statusSetter = service === 'proxy' ? setProxyStatus : setModelStatus
    const currentStatus = service === 'proxy' ? proxyStatus : modelStatus
    
    statusSetter(prev => ({
      isConnected: false,
      retryCount: prev.retryCount + 1
    }))

    if (currentStatus.retryCount >= 4) {
      setError(
        service === 'proxy'
          ? 'Unable to connect to proxy service. Please check if the server is running.'
          : 'Unable to connect to model service. Please check if the model is running.'
      )
    }
    setIsInitializing(true)
  }

  useEffect(() => {
    let isComponentMounted = true
    const retryInterval = 5000

    const checkConnection = async () => {
      if (!isComponentMounted) return
      await checkServiceStatus()
    }

    const timer = setInterval(checkConnection, retryInterval)
    checkConnection()

    return () => {
      isComponentMounted = false
      clearInterval(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() } as Message
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.content })
      })

      if (!response.ok) throw new Error('Network response was not ok')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Failed to get response reader')

      let assistantMessage = ''
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
              const jsonChunk = JSON.parse(line)
              if (jsonChunk.message?.content) {
                const filteredContent = jsonChunk.message.content
                  .replace(/<think>[\s\S]*?<\/think>\s*/g, '')
                  .replace(/^\s*<think>.*?<\/think>\s*/gm, '')
                  .trim()
                
                if (filteredContent !== '') {
                  assistantMessage += filteredContent + ' '
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1]
                    return lastMessage?.role === 'assistant'
                      ? [...prev.slice(0, -1), { role: 'assistant', content: assistantMessage.trim() }]
                      : [...prev, { role: 'assistant', content: assistantMessage.trim() }]
                  })
                }
              }
            } catch (e) {
              console.debug('Invalid JSON chunk:', line)
            }
          }
          
          buffer = lines[lines.length - 1]
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => prev.slice(0, -1))
      setError('An error occurred while processing your request. Please try again.')
      setIsInitializing(true)
      checkServiceStatus()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && !isLoading) {
        e.preventDefault()
        setInput('')
        document.querySelector('input')?.focus()
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false)
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isLoading])

  const handleSettingsChange = (key: keyof Settings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="chat-container">
      {error && <div className="error-toast">{error}</div>}
      {isInitializing ? (
        <div className="loading-screen">
          <div className="loading-content">
            <h2>Initializing Blackbox</h2>
            <div className="status-message">
              {(proxyStatus.retryCount >= 5 || modelStatus.retryCount >= 5) ? (
                <div className="error-state">
                  {error && <div className="error-message">{error}</div>}
                  {!error && <div className="error-message">Connection attempts exceeded. Please check if the services are running.</div>}
                </div>
              ) : (
                <>
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Establishing connection to services...</p>
                  <div className="retry-count">
                    {(proxyStatus.retryCount > 0 || modelStatus.retryCount > 0) && (
                      <>
                        {proxyStatus.retryCount > 0 && `Proxy Connection: Attempt ${proxyStatus.retryCount} of 5`}
                        {proxyStatus.retryCount > 0 && modelStatus.retryCount > 0 && ' | '}
                        {modelStatus.retryCount > 0 && `Model Connection: Attempt ${modelStatus.retryCount} of 5`}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="logo">blackbox</div>
          <button
            className="settings-toggle"
            onClick={() => setIsSettingsOpen(prev => !prev)}
            aria-label="Toggle settings"
          >
            ⚙️
          </button>
          <div className={`settings-panel ${isSettingsOpen ? 'open' : ''}`}>
            <h2>Settings</h2>
            <div className="settings-group">
              <div className="coming-soon-message">
                <span>🚀 These settings are being configured. More options coming soon!</span>
              </div>
              <label htmlFor="model">Model</label>
              <select
                id="model"
                value={settings.model}
                onChange={(e) => handleSettingsChange('model', e.target.value)}
              >
                <option value="deepseek-r1-1.5b">DeepSeek R1 (1.5B)</option>
                <option value="deepseek-r1-7b">DeepSeek R1 (7B)</option>
                <option value="deepseek-r1-8b">DeepSeek R1 (8B)</option>
                <option value="deepseek-r1-14b">DeepSeek R1 (14B)</option>
                <option value="deepseek-r1-32b">DeepSeek R1 (32B)</option>
                <option value="deepseek-r1-67b">DeepSeek R1 (67B)</option>
                <option value="deepseek-r1-70b">DeepSeek R1 (70B)</option>
              </select>

              <label htmlFor="temperature">Temperature</label>
              <input
                type="number"
                id="temperature"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingsChange('temperature', parseFloat(e.target.value))}
              />

              <label htmlFor="maxTokens">Max Tokens</label>
              <input
                type="number"
                id="maxTokens"
                min="1"
                max="4096"
                step="1"
                value={settings.maxTokens}
                onChange={(e) => handleSettingsChange('maxTokens', parseInt(e.target.value))}
              />

              <label htmlFor="systemPrompt">System Prompt</label>
              <input
                type="text"
                id="systemPrompt"
                value={settings.systemPrompt}
                onChange={(e) => handleSettingsChange('systemPrompt', e.target.value)}
              />
            </div>
          </div>
          <div className="status-indicators">
            <div className={`status-indicator ${proxyStatus.isConnected ? 'success' : 'error'}`}>
              <span className="status-dot"></span>
              <span className="status-label">Proxy</span>
            </div>
            <div className={`status-indicator ${modelStatus.isConnected ? 'success' : 'error'}`}>
              <span className="status-dot"></span>
              <span className="status-label">Model</span>
            </div>
          </div>
          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">
                  {message.content.split('```').map((block, index) => {
                    if (index % 2 === 0) {
                      return <div key={index} className="text-block">{block}</div>
                    } else {
                      const [lang, ...code] = block.split('\n')
                      return (
                        <pre key={index} className="code-block">
                          <div className="code-header">
                            <span className="language">{lang || 'plaintext'}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(code.join('\n'))}
                              className="copy-button"
                              title="Copy code"
                            >
                              📋
                            </button>
                          </div>
                          <code className={`language-${lang || 'plaintext'}`}>
                            {code.join('\n')}
                          </code>
                        </pre>
                      )
                    }
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-content loading">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || error}
            />
            <button type="submit" disabled={isLoading || !input.trim() || error}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default App
