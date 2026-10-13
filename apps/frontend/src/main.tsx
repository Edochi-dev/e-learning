import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerStaleChunkReload } from './lib/stale-chunk-reload'

registerStaleChunkReload({
  target: window,
  storage: window.sessionStorage,
  reload: () => window.location.reload(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
