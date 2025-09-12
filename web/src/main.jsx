import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { PersonaProvider } from './contexts/PersonaContext'
import './index.css'
import './styles/themes.css'

// Debug logging
console.log('Main.jsx loading...');

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <ThemeProvider>
        <PersonaProvider>
          <App />
        </PersonaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback render
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1>Cora - Error Loading</h1>
      <p style="color: red;">Error: ${error.message}</p>
      <p>Please check the browser console for more details.</p>
    </div>
  `;
}