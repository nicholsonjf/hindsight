import React, { useState, useEffect, useRef } from 'react'
import { LM_STUDIO_TOOL_DEFINITIONS, executeHindsightTool } from '../lib/hindsightTools'
import './ChatPanel.css'

const DEFAULT_LM_STUDIO_URL = 'http://127.0.0.1:1234'
const DEFAULT_HINDSIGHT_API_URL = 'http://localhost:3000'
const DEFAULT_CHAT_MODEL = 'qwen/qwen3-vl-4b'
const MAX_TOOL_CALLING_ROUNDS = 6

function normalizeLmStudioBaseUrl(rawUrl) {
  const trimmed = rawUrl.trim().replace(/\/+$/, '')
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice(5)}`
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice(6)}`
  return trimmed
}

function parseJsonSafe(value, fallback = {}) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function fetchConfiguredModel(hindsightApiUrl) {
  const response = await fetch(`${hindsightApiUrl}/config`)
  if (!response.ok) {
    throw new Error(`Failed to fetch config (${response.status})`)
  }

  const body = await response.json()
  return typeof body?.visionModel === 'string' && body.visionModel.trim()
    ? body.visionModel.trim()
    : null
}

async function createChatCompletion({ baseUrl, apiToken, model, messages }) {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      tools: LM_STUDIO_TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0
    })
  })

  if (!response.ok) {
    const body = await response.text()
    const details = body ? `: ${body}` : ''
    throw new Error(`LM Studio API error ${response.status}${details}`)
  }

  return response.json()
}

function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const conversationRef = useRef([])
  const lmStudioBaseUrlRef = useRef(DEFAULT_LM_STUDIO_URL)
  const hindsightApiUrlRef = useRef(DEFAULT_HINDSIGHT_API_URL)
  const apiTokenRef = useRef('')
  const modelRef = useRef(DEFAULT_CHAT_MODEL)

  const examplePrompts = [
    'Summarize my recent activity',
    'What tasks did I complete today?',
    'Help me write a standup update',
    'What should I focus on next?'
  ]

  // Initialize connection settings and load chat model from API config (.env -> VISION_MODEL)
  useEffect(() => {
    let disposed = false
    lmStudioBaseUrlRef.current = normalizeLmStudioBaseUrl(import.meta.env.VITE_LM_STUDIO_URL || DEFAULT_LM_STUDIO_URL)
    hindsightApiUrlRef.current = (import.meta.env.VITE_HINDSIGHT_API_URL || DEFAULT_HINDSIGHT_API_URL).trim().replace(/\/+$/, '')
    apiTokenRef.current = (import.meta.env.VITE_LM_API_TOKEN || '').trim()
    modelRef.current = (import.meta.env.VITE_LM_CHAT_MODEL || DEFAULT_CHAT_MODEL).trim()

    const initModel = async () => {
      try {
        const configuredModel = await fetchConfiguredModel(hindsightApiUrlRef.current)
        if (!disposed && configuredModel) {
          modelRef.current = configuredModel
          console.info(`Using configured VISION_MODEL from API: ${configuredModel}`)
        }
      } catch (configError) {
        console.warn('Could not load configured VISION_MODEL from API; using chat fallback model:', configError)
      }
    }

    void initModel()

    return () => {
      disposed = true
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
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setError(null)

    const chatMessages = [...conversationRef.current, { role: 'user', content: userMessage }]
    let assistantContent = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      for (let round = 0; round < MAX_TOOL_CALLING_ROUNDS; round += 1) {
        const completion = await createChatCompletion({
          baseUrl: lmStudioBaseUrlRef.current,
          apiToken: apiTokenRef.current,
          model: modelRef.current,
          messages: chatMessages
        })

        const choice = completion?.choices?.[0]
        const assistantMessage = choice?.message
        if (!assistantMessage) {
          throw new Error('LM Studio returned an empty response')
        }

        chatMessages.push({
          role: 'assistant',
          content: assistantMessage.content ?? '',
          tool_calls: assistantMessage.tool_calls ?? []
        })

        const toolCalls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : []
        if (choice.finish_reason === 'tool_calls' && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            const toolName = toolCall?.function?.name
            const toolArgs = parseJsonSafe(toolCall?.function?.arguments ?? '{}', {})
            const toolResult = await executeHindsightTool(toolName, toolArgs, hindsightApiUrlRef.current)
            console.log(`Tool called: ${toolName}`, toolArgs)
            console.log('Tool result:', toolResult)
            chatMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(toolResult)
            })
          }
          continue
        }

        assistantContent = (assistantMessage.content || '').trim()
        break
      }

      if (!assistantContent) {
        assistantContent = 'I processed your request but have no text response.'
      }

      conversationRef.current = chatMessages
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
        return updated
      })
    } catch (err) {
      console.error('LM Studio chat error:', err)
      const errorMessage = toErrorMessage(err)
      const configuredModel = modelRef.current
      setError(`Chat failed: ${errorMessage}`)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Sorry, chat failed. Ensure LM Studio is running at ${lmStudioBaseUrlRef.current} and model "${configuredModel}" is loaded.`
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
