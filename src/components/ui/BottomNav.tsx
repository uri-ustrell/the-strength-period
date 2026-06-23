import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  Globe,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useSessionStore } from '@/stores/sessionStore'

const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/planning', labelKey: 'nav.planning', icon: CalendarDays },
  { path: '/session', labelKey: 'nav.session', icon: Dumbbell },
  { path: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
] as const

const LANGUAGES = ['ca', 'es', 'en'] as const

/**
 * Dock primitive.
 *
 * Floating bottom navigation (frosted glass over the bg). Exposed as
 * `BottomNav` for backwards compatibility with the existing layout.
 *
 * Hidden on routes outside the main shell and during an active session
 * (anti-misclick safety while training).
 */
export const BottomNav = () => {
  const location = useLocation()
  const { t, i18n } = useTranslation('common')
  const [menuOpen, setMenuOpen] = useState(false)
  const sessionStartedAt = useSessionStore((s) => s.sessionStartedAt)
  const isFinished = useSessionStore((s) => s.isFinished)

  const showPaths = ['/dashboard', '/planning', '/session', '/stats', '/settings']
  if (!showPaths.includes(location.pathname)) return null
  if (location.pathname === '/session' && sessionStartedAt && !isFinished) return null

  const currentLang = i18n.language?.substring(0, 2) ?? 'en'

  const handleLanguageChange = (lang: string) => {
    void i18n.changeLanguage(lang)
  }

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {menuOpen && (
        <div
          className="safe-area-bottom fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-border-subtle bg-surface-elevated/95 p-5 shadow-elevated backdrop-blur"
          role="dialog"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-text-primary">
              {t('nav.settings')}
            </h3>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-full p-1 text-text-muted hover:text-text-primary"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Globe size={14} className="text-text-muted" />
              <label htmlFor="language-select" className="text-sm text-text-muted">
                {t('nav.language')}
              </label>
            </div>
            <select
              id="language-select"
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-sm font-medium text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-surface text-text-primary">
                  {t(`language.${lang}`)}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
          >
            <Settings size={16} />
            {t('nav.edit_profile')}
          </Link>
        </div>
      )}

      <nav
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/85 backdrop-blur-md"
        aria-label="Primary"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-mono text-[10px] uppercase tracking-wide">
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            className="flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-text-muted transition-colors hover:text-text-primary"
          >
            <Menu size={20} />
            <span className="font-mono text-[10px] uppercase tracking-wide">
              {t('nav.more', { defaultValue: 'M\u00e9s' })}
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
