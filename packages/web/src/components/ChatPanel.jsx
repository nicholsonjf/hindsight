import React, { useState, useEffect, useRef } from 'react'
import { LMStudioClient, Chat } from "lmstudio-js";
import './ChatPanel.css'

function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const clientRef = useRef(null)
  const toolsSessionRef = useRef(null)
  const chatRef = useRef(Chat.empty())

  const examplePrompts = [
    'Summarize my recent activity',
    'What tasks did I complete today?',
    'Help me write a standup update',
    'What should I focus on next?'
  ]

  // Initialize LM Studio client and plugin tools session
  useEffect(() => {
    const initClient = async () => {
      try {
        const apiToken = import.meta.env.VITE_LM_API_TOKEN
        if (!apiToken) {
          console.warn('LM_API_TOKEN not found in environment variables. LM Studio connection may fail.')
        }
        const lmStudioUrl = import.meta.env.VITE_LM_STUDIO_URL || 'ws://127.0.0.1:1234'
        const hindsightApiUrl = import.meta.env.VITE_HINDSIGHT_API_URL || 'http://localhost:3000'
        const client = new LMStudioClient({
          baseUrl: lmStudioUrl,
          apiToken: apiToken
        })
        clientRef.current = client

        // Set up remote tools session for the hindsight plugin
        const toolsSession = await client.plugins.pluginTools("nicholsonjf/hindsight", {
          pluginConfig: {
            fields: [
              { key: "hindsightApiUrl", value: hindsightApiUrl }
            ]
          }
        })
        toolsSessionRef.current = toolsSession
        console.log('Hindsight plugin tools session initialized')
      } catch (err) {
        console.error('Failed to initialize LM Studio client or plugin tools:', err)
      }
    }
    initClient()

    // Cleanup tools session on unmount
    return () => {
      if (toolsSessionRef.current && toolsSessionRef.current[Symbol.dispose]) {
        toolsSessionRef.current[Symbol.dispose]()
      }
    }
  }, [])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle sending message
  const sendMessage = async () => {
    if (!input.trim() || !clientRef.current || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setError(null)

    // Append user message to chat history
    chatRef.current.append("user", userMessage)

    // Add placeholder for streaming assistant response
    let assistantContent = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      // Get list of loaded models
      const models = await clientRef.current.llm.listLoaded()

      if (models.length === 0) {
        throw new Error('No models loaded in LM Studio')
      }

      // Use the first loaded model
      const model = models[0]

      // Get plugin tools (may be empty if plugin not available)
      const tools = toolsSessionRef.current?.tools || []

      // Use .act() method with plugin tools for agentic behavior
      await model.act(chatRef.current, tools, {
        onMessage: (message) => {
          // Append message to chat history to maintain conversation context
          chatRef.current.append(message)
        },
        onPredictionFragment: (fragment) => {
          // Skip structural fragments (formatting tokens)
          if (fragment.isStructural) return
          // Accumulate content and update display
          assistantContent += fragment.content
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
            return updated
          })
        },
        onToolCallRequestEnd: (_roundIndex, _callId, info) => {
          console.log(`Tool called: ${info.toolCallRequest.name}`, info.toolCallRequest.arguments)
        },
        onToolCallResult: (_roundIndex, _callId, result) => {
          console.log('Tool result:', result)
        }
      })

      // If no content was streamed, update with final message
      if (!assistantContent) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'I processed your request but have no text response.' }
          return updated
        })
      }
    } catch (err) {
      console.error('LM Studio error:', err)
      setError('Failed to connect to LM Studio. Please ensure LM Studio is running at http://127.0.0.1:1234 with a model loaded.')
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I couldn\'t connect to LM Studio. Please check that it\'s running and a model is loaded.'
        }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Handle clicking example prompt
  const handlePromptClick = (prompt) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className="chat-panel">
      <div className="chat-content">
        <div className="tips-section">
          <p className="tips-title">Try asking:</p>
          <div className="tips-list">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                className="tip-button"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}`}
            >
              {message.content}
            </div>
          ))}
          {loading && (
            <div className="message assistant typing">
              <span className="typing-indicator">●</span>
              <span className="typing-indicator">●</span>
              <span className="typing-indicator">●</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your recent activity..."
        />
        <button
          className="send-button"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatPanel
