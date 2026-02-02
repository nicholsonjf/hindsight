import React from 'react'
import './App.css'
import Header from './components/Header'
import WorklogPanel from './components/WorklogPanel'
import ChatPanel from './components/ChatPanel'

function App() {
  return (
    <div className="app">
      <Header />
      <div className="main-content">
        <WorklogPanel />
        <ChatPanel />
      </div>
    </div>
  )
}

export default App
