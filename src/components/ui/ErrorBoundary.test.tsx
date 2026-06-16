import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const Boom = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders the fallback (heading + reload + export) instead of a blank screen when a child throws', () => {
    // React logs the caught error to console.error; silence it for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading')).toBeInTheDocument()
    // Reload action — name matches any of the three locales.
    expect(
      screen.getByRole('button', { name: /reload|recarrega|recargar/i }),
    ).toBeInTheDocument()
    // The export escape hatch is present so the user can back up before reloading.
    expect(screen.getByRole('button', { name: /export|exporta/i })).toBeInTheDocument()

    spy.mockRestore()
  })

  it('renders children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>healthy content</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('healthy content')).toBeInTheDocument()
  })
})
