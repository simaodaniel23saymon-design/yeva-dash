import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Importadas aqui e não via @import em index.css: o @tailwindcss/postcss não reescreve os url() do @fontsource.
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
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
