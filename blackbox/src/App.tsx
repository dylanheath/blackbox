import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
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
                <div className="message-content">{message.content}</div>
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
