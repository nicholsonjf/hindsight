import React, { useState, useEffect, useRef } from 'react'
import './WorklogPanel.css'

function WorklogPanel() {
  const [worklogs, setWorklogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const panelRef = useRef(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Fetch worklogs from API
  const fetchWorklogs = async () => {
    try {
      const now = Math.floor(Date.now() / 1000)
      const twentyMinutesAgo = now - (20 * 60)

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/worklogs?start=${twentyMinutesAgo}&end=${now}`)

      if (!response.ok) {
        throw new Error('Failed to fetch worklogs')
      }

      const data = await response.json()

      // Validate that data is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format: expected array')
      }

      setWorklogs(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Format timestamp to 12-hour format
  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000)
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12 // 0 should be 12
    const minutesStr = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${minutesStr}${ampm}`
  }

  // Check if user is scrolled to bottom
  const checkScrollPosition = () => {
    if (panelRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = panelRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setShouldAutoScroll(isAtBottom)
    }
  }

  // Auto-scroll to bottom if needed
  useEffect(() => {
    if (shouldAutoScroll && panelRef.current && worklogs.length > 0) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight
    }
  }, [worklogs, shouldAutoScroll])

  // Initial fetch and polling
  useEffect(() => {
    fetchWorklogs()
    const interval = setInterval(fetchWorklogs, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="worklog-panel"
      ref={panelRef}
      onScroll={checkScrollPosition}
    >
      <div className="worklog-content">
        {loading ? (
          <div className="loading">Loading recent activity...</div>
        ) : error ? (
          <div className="error">
            <p>Unable to connect to worklogs API</p>
            <p className="error-details">{error}</p>
            <p className="error-retry">Retrying automatically...</p>
          </div>
        ) : worklogs.length === 0 ? (
          <div className="empty-state">
            No recent activity in the last 20 minutes
          </div>
        ) : (
          worklogs.map((log, index) => (
            <div key={index} className="worklog-entry">
              <div className="worklog-timestamp">{formatTime(log.timestamp)}</div>
              <div className="worklog-summary">{log.log}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default WorklogPanel
