import React, { useState, useEffect, useRef } from 'react'
import { LMStudioClient } from "lmstudio-js";
import './ChatPanel.css'

function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const clientRef = useRef(null)

  const examplePrompts = [
    'Summarize my recent activity',
    'What tasks did I complete today?',
    'Help me write a standup update',
    'What should I focus on next?'
  ]

  // Initialize LM Studio client
  useEffect(() => {
    const initClient = async () => {
      try {
        const apiToken = import.meta.env.VITE_LM_API_TOKEN
        if (!apiToken) {
          console.warn('LM_API_TOKEN not found in environment variables. LM Studio connection may fail.')
        }
        const lmStudioUrl = import.meta.env.VITE_LM_STUDIO_URL || 'ws://127.0.0.1:1234'
        const client = new LMStudioClient({
          baseUrl: lmStudioUrl,
          apiToken: apiToken
        })
        clientRef.current = client
      } catch (err) {
        console.error('Failed to initialize LM Studio client:', err)
      }
    }
    initClient()
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

    try {
      // Get list of loaded models
      const models = await clientRef.current.llm.listLoaded()

      if (models.length === 0) {
        throw new Error('No models loaded in LM Studio')
      }

      // Use the first loaded model (should be qwen/qwen3-vl-4b)
      const llm = models[0]

      // Use the .respond() method to generate response
      const result = await llm.respond(userMessage)

      setMessages(prev => [...prev, { role: 'assistant', content: result.content }])
    } catch (err) {
      console.error('LM Studio error:', err)
      setError('Failed to connect to LM Studio. Please ensure LM Studio is running at http://127.0.0.1:1234 with qwen/qwen3-vl-4b model loaded.')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to LM Studio. Please check that it\'s running and the qwen/qwen3-vl-4b model is loaded.'
      }])
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
