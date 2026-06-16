import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ExportButton } from '@/components/data/ExportButton'
import { Button } from '@/components/ui/Button'

const ErrorFallback = () => {
  const { t } = useTranslation('common')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('errors.boundary_title')}
        </h1>
        <p className="text-sm text-text-muted">{t('errors.boundary_message')}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button onClick={() => window.location.reload()}>{t('errors.boundary_reload')}</Button>
        <ExportButton />
      </div>
    </div>
  )
}

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Root error boundary. React only supports error boundaries as class components
 * (there is no hook equivalent for `getDerivedStateFromError` /
 * `componentDidCatch`), so this is the documented exception to the
 * "functional components only" rule in specs/CONVENTIONS.md.
 *
 * This is a local-first, no-backend app: an uncaught render error would
 * otherwise leave the user staring at a blank screen with their data trapped in
 * IndexedDB. The fallback offers a data export before the user reloads.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
