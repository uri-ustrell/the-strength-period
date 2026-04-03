import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/i18n'
import '@/index.css'

async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true') {
    const { worker } = await import('@/mocks/browser')
    return worker.start({ onUnhandledRequest: 'bypass' })
  }
}

enableMocking()
  .catch((err) => console.error('MSW failed to start:', err))
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
