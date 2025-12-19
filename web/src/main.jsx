import './polyfills'  // Re-enabled - may help with React initialization
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary'
import errorLogger from './lib/error-logger'

// Keep original ErrorBoundary as fallback
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { PersonaProvider } from './contexts/PersonaContext'
import AccessibilityProvider from './components/AccessibilityProvider'
import './index.css'
import './styles/themes.css'
import './styles/accessibility.css'

// Debug logging
console.log('Main.jsx loading...');

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <EnhancedErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider>
          <PersonaProvider>
            <App />
          </PersonaProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </EnhancedErrorBoundary>
  )
} catch (error) {
  console.error('Failed to render app:', error);
  errorLogger.logError(error, { source: 'main.jsx', phase: 'initial-render' });

  // Fallback render with better error display
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937;">Cora - Error Loading</h1>
      <div style="background: #fee; padding: 16px; border-radius: 8px; border: 1px solid #fcc;">
        <p style="color: #991b1b; margin: 0 0 8px 0; font-weight: 600;">Error: ${error.message}</p>
        <p style="color: #7f1d1d; margin: 0;">Please check the browser console for more details.</p>
      </div>
      <button onclick="window.location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}