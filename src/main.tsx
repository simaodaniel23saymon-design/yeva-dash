import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { registerYevaServiceWorker } from './lib/swClient'

registerYevaServiceWorker()

const rootEl = document.getElementById('root')
if (!rootEl) {
  window.location.replace('/recuperar.html')
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>,
    )
  } catch {
    window.location.replace('/recuperar.html')
  }
}
