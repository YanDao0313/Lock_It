import React from 'react'
import ReactDOM from 'react-dom/client'
import './assets/main.css'
import LockScreen from './LockScreen'
import Setup from './Setup'
import Settings from './Settings'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(rootElement)

function renderByHash() {
  const hash = window.location.hash.slice(1) || 'lockscreen'

  switch (hash) {
    case 'setup':
      root.render(
        <React.StrictMode>
          <Setup />
        </React.StrictMode>
      )
      break
    case 'settings':
      root.render(
        <React.StrictMode>
          <Settings />
        </React.StrictMode>
      )
      break
    case 'lockscreen':
    default:
      root.render(
        <React.StrictMode>
          <LockScreen />
        </React.StrictMode>
      )
      break
  }
}

renderByHash()
window.addEventListener('hashchange', renderByHash)
