import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { assertDefined } from '@/utils/assertDefined'
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
    createRoot(
      assertDefined(document.getElementById('root'), 'Root element #root not found')
    ).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
