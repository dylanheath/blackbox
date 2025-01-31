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
  theme: 'light' | 'dark' | 'system'
  renderMarkdown: boolean
  codeHighlighting: boolean
  keyboardShortcuts: boolean
  fontSize: 'small' | 'medium' | 'large'
  showTimestamps: boolean
  soundEnabled: boolean
  autoScroll: boolean
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  systemPrompt: string
  model: string
  favorite: boolean
  tags: string[]
}

interface ServiceStatus {
  isConnected: boolean
  retryCount: number
}

function App() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('chatMessages')
    return savedMessages ? JSON.parse(savedMessages).map((msg: any) => ({
      ...msg,
      id: msg.id || Date.now().toString(),
      timestamp: msg.timestamp || Date.now()
    })) : []
  })

  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore')
    if (!hasVisitedBefore) {
      setShowWelcomeModal(true)
      localStorage.setItem('hasVisitedBefore', 'true')
    }
  }, [])
  localStorage.setItem('chatMessages', JSON.stringify(messages))
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
    theme: 'system',
    renderMarkdown: true,
    codeHighlighting: true,
    keyboardShortcuts: true,
    fontSize: 'medium',
    showTimestamps: true,
    soundEnabled: true,
    autoScroll: true
  })
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const savedConversations = localStorage.getItem('conversations')
    return savedConversations ? JSON.parse(savedConversations) : []
  })
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSpeak = (text: string, messageId: string) => {
    if (isSpeaking === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(messageId);
  };

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const updatedConversations = conversations.map(conv =>
        conv.id === selectedConversation
          ? { ...conv, messages, updatedAt: Date.now() }
          : conv
      )
      setConversations(updatedConversations)
      localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    }
  }, [messages, selectedConversation])

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })
  }

  const createNewChat = () => {
    if (messages.length > 0) {
      const timestamp = Date.now()
      const newChat: Conversation = {
        id: timestamp.toString(),
        title: formatDateTime(timestamp),
        messages: [...messages],
        createdAt: timestamp,
        updatedAt: timestamp,
        systemPrompt: settings.systemPrompt || '',
        model: settings.model,
        favorite: false,
        tags: []
      }
      setConversations(prev => [...prev, newChat])
      localStorage.setItem('conversations', JSON.stringify([...conversations, newChat]))
    }
    
    setMessages([])
    setSelectedConversation(null)
  }

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

  const exportConversation = (format: 'json' | 'markdown' | 'txt') => {
    if (!selectedConversation) return
    const conversation = conversations.find(c => c.id === selectedConversation)
    if (!conversation) return

    let content = ''
    switch (format) {
      case 'json':
        content = JSON.stringify(conversation, null, 2)
        break
      case 'markdown':
        content = `# ${conversation.title}\n\n${conversation.messages.map(m => 
          `**${m.role}**: ${m.content}\n`
        ).join('\n')}`
        break
      case 'txt':
        content = `${conversation.title}\n\n${conversation.messages.map(m =>
          `${m.role}: ${m.content}\n`
        ).join('\n')}`
        break
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversation.id}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (selectedConversation) {
      const updatedConversations = conversations.map(conv =>
        conv.id === selectedConversation
          ? { ...conv, messages: [...messages], updatedAt: Date.now() }
          : conv
      )
      setConversations(updatedConversations)
      localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    }

    const userMessage = { role: 'user', content: input.trim(), id: Date.now().toString(), timestamp: Date.now() } as Message
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
      if (!settings.keyboardShortcuts) return

      // Global shortcuts
      if (e.key === '/' && !isLoading) {
        e.preventDefault()
        setInput('')
        document.querySelector('input')?.focus()
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false)
        setIsSidebarOpen(false)
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsOpen(prev => !prev)
      }

      // Conversation management
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        exportConversation('markdown')
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        // Create new conversation
        const newConversation: Conversation = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          systemPrompt: settings.systemPrompt,
          model: settings.model,
          favorite: false,
          tags: []
        }
        setConversations(prev => [...prev, newConversation])
        setSelectedConversation(newConversation.id)
      }
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

  const handleClearChat = () => {
    setShowConfirmation(true);
    setChatToDelete(null);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setShowConfirmation(true);
  };

  const confirmClear = () => {
    if (chatToDelete) {
      setConversations(prev => prev.filter(conv => conv.id !== chatToDelete));
      localStorage.setItem('conversations', JSON.stringify(conversations.filter(conv => conv.id !== chatToDelete)));
      if (selectedConversation === chatToDelete) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } else {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
    setShowConfirmation(false);
    setChatToDelete(null);
  };

  const cancelClear = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="chat-container">
      <div className="header-buttons">
      </div>
      {messages.length === 0 && (
        <div className="empty-chat-message">
          <p className="new-chat-noti">Start a New Chat</p>
        </div>
      )}

      {showWelcomeModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowWelcomeModal(false)} />
          <div className="confirmation-modal welcome-modal">
            <h3>Welcome to Blackbox</h3>
            <p>A powerful, privacy-focused AI interface for running large language models locally through Ollama.</p>
            
            <div className="welcome-section">
              <h4>Why Local AI?</h4>
              <ul>
                <li>Complete Privacy - Your data never leaves your machine</li>
                <li>Cost Effective - No usage costs or API fees</li>
                <li>High Performance - Low latency responses</li>
                <li>Full Control - Customize model configurations</li>
              </ul>
            </div>

            <div className="welcome-section">
              <h4>Key Features</h4>
              <ul>
                <li>Real-time streaming chat responses</li>
                <li>Clean, modern user interface</li>
                <li>Service status monitoring</li>
                <li>Automatic reconnection handling</li>
                <li>Support for any Ollama-compatible model</li>
              </ul>
            </div>

            <div className="welcome-section">
              <h4>Getting Started</h4>
              <ul>
                <li>Click the sparkle icon to start a new chat</li>
                <li>Use '/' to focus the input field</li>
                <li>Access settings with Cmd/Ctrl + ,</li>
                <li>Clear chat history with the trash icon</li>
              </ul>
            </div>

            <p className="welcome-footer">Made with love by Dylan Heathcote</p>
            
            <div className="confirmation-buttons">
              <button className="confirm-button" onClick={() => setShowWelcomeModal(false)}>
                Get Started
              </button>
            </div>
          </div>
        </>
      )}
      {showConfirmation && (
        <>
          <div className="modal-overlay" onClick={cancelClear} />
          <div className="confirmation-modal">
            <h3>{chatToDelete ? 'Delete Chat' : 'Clear Chat History'}</h3>
            <p>{chatToDelete ? 'Are you sure you want to delete this chat?' : 'Are you sure you want to clear all chat messages?'} This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button className="cancel-button" onClick={cancelClear}>
                Cancel
              </button>
              <button className="confirm-button" onClick={confirmClear}>
                Clear
              </button>
            </div>
          </div>
        </>
      )}

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
          <div className="header-buttons">
          <button
              className="settings-toggle"
              onClick={createNewChat}
              aria-label="Create new chat"
            >
              ✨
            </button>
          <button
              className="settings-toggle"
              onClick={handleClearChat}
              aria-label="Clear chat history"
            >
              🗑️
            </button>
            <button
              className="settings-toggle"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              aria-label="View chat history"
            >
              💬
            </button>
            <a
              href="https://github.com/dylanheath/blackbox"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              aria-label="View source on GitHub"
            >
              <span role="img" aria-label="GitHub">📦</span>
            </a>
            <button
              className="settings-toggle"
              onClick={() => setShowWelcomeModal(true)}
              aria-label="Show information"
            >
              ℹ️
            </button>
            <button
              className="settings-toggle"
              onClick={() => setIsSettingsOpen(prev => !prev)}
              aria-label="Toggle settings"
            >
              ⚙️
            </button>
          </div>
          <div className={`chat-history-panel ${isSidebarOpen ? 'open' : ''}`}>
            <h2>Chat History</h2>
            <div className="chat-list">
              {conversations.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedConversation === chat.id ? 'active' : ''}`}
                  onClick={() => {
                    if (selectedConversation && messages.length > 0) {
                      const updatedConversations = conversations.map(conv =>
                        conv.id === selectedConversation
                          ? { ...conv, messages, updatedAt: Date.now() }
                          : conv
                      )
                      setConversations(updatedConversations)
                      localStorage.setItem('conversations', JSON.stringify(updatedConversations))
                    }
                    
                    setSelectedConversation(chat.id)
                    setMessages(chat.messages.map(msg => ({
                      role: msg.role,
                      content: msg.content,
                      id: msg.id || Date.now().toString(),
                      timestamp: msg.timestamp || Date.now()
                    })))
                  }}
                >
                  {chat.title}
                  <button
                    className="delete-chat-button"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    aria-label="Delete chat"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={`settings-panel ${isSettingsOpen ? 'open' : ''}`}>
            <h2>Settings</h2>
            <div className="coming-soon-message">
              <span>✨ These features are coming soon!</span>
            </div>
            <div className="settings-group">
              <div className="settings-section">
                <h3>Model Configuration</h3>
                <label htmlFor="model">Model</label>
                <select
                  id="model"
                  value={settings.model}
                  onChange={(e) => handleSettingsChange('model', e.target.value)}
                >
                  <option value="deepseek-r1-1.5b">DeepSeek R1 (1.5B)</option>
                  <option value="deepseek-r1-7b">DeepSeek R1 (7B)</option>
                  <option value="deepseek-r1-14b">DeepSeek R1 (14B)</option>
                  <option value="deepseek-r1-32b">DeepSeek R1 (32B)</option>
                  <option value="deepseek-r1-67b">DeepSeek R1 (67B)</option>
                </select>

                <label htmlFor="temperature">Temperature</label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => handleSettingsChange('temperature', parseFloat(e.target.value))}
                />
                <span className="setting-value">{settings.temperature}</span>

                <label htmlFor="maxTokens">Max Tokens</label>
                <input
                  type="range"
                  id="maxTokens"
                  min="1"
                  max="4096"
                  step="1"
                  value={settings.maxTokens}
                  onChange={(e) => handleSettingsChange('maxTokens', parseInt(e.target.value))}
                />
                <span className="setting-value">{settings.maxTokens}</span>
              </div>



              <div className="settings-section">
                <h3>Interface Settings</h3>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.renderMarkdown}
                    onChange={(e) => handleSettingsChange('renderMarkdown', e.target.checked)}
                  />
                  Enable Markdown Rendering
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.codeHighlighting}
                    onChange={(e) => handleSettingsChange('codeHighlighting', e.target.checked)}
                  />
                  Enable Code Syntax Highlighting
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.keyboardShortcuts}
                    onChange={(e) => handleSettingsChange('keyboardShortcuts', e.target.checked)}
                  />
                  Enable Keyboard Shortcuts
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.showTimestamps}
                    onChange={(e) => handleSettingsChange('showTimestamps', e.target.checked)}
                  />
                  Show Message Timestamps
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingsChange('soundEnabled', e.target.checked)}
                  />
                  Enable Sound Notifications
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoScroll}
                    onChange={(e) => handleSettingsChange('autoScroll', e.target.checked)}
                  />
                  Auto-scroll to New Messages
                </label>

                <label htmlFor="fontSize">Font Size</label>
                <select
                  id="fontSize"
                  value={settings.fontSize}
                  onChange={(e) => handleSettingsChange('fontSize', e.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>

                <label htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  value={settings.theme}
                  onChange={(e) => handleSettingsChange('theme', e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
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
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
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
              placeholder={messages.length === 0 ? "Start a New Chat..." : "Type your message..."}
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
