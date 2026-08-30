import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const SPLASH_MIN_MS = 1400
const SPLASH_MAX_MS = 1800

function dismissSplash() {
  const el = document.getElementById('yeva-splash')
  if (!el) return

  const startedAttr = el.getAttribute('data-started')
  const started = startedAttr ? Number(startedAttr) : performance.now()
  const elapsed = performance.now() - started
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed)

  const hide = () => {
    el.classList.add('yeva-splash--hide')
    window.setTimeout(() => el.remove(), 400)
  }

  if (wait > 0) window.setTimeout(hide, wait)
  else hide()

  // Safety: never leave splash stuck if transitions fail
  window.setTimeout(() => {
    el.remove()
  }, SPLASH_MAX_MS + 500)
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW opcional */
    })
  })
}

const splash = document.getElementById('yeva-splash')
if (splash) splash.setAttribute('data-started', String(performance.now()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Hide splash after first paint / min duration (CSS also auto-hides if JS fails)
requestAnimationFrame(() => {
  requestAnimationFrame(dismissSplash)
})
