import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, CalendarDays, Dumbbell, BarChart3, Menu, Globe, Settings, X } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/planning', labelKey: 'nav.planning', icon: CalendarDays },
  { path: '/session', labelKey: 'nav.session', icon: Dumbbell },
  { path: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
] as const

const LANGUAGES = ['ca', 'es', 'en'] as const

export const BottomNav = () => {
  const location = useLocation()
  const { t, i18n } = useTranslation('common')
  const [menuOpen, setMenuOpen] = useState(false)

  const showPaths = ['/dashboard', '/planning', '/session', '/stats', '/settings']
  if (!showPaths.includes(location.pathname)) return null

  const currentLang = i18n.language?.substring(0, 2) ?? 'en'

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  return (
    <>
      {/* Menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide-up menu */}
      {menuOpen && (
        <div
          className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-xl border-t border-gray-200 p-5 safe-area-bottom animate-slide-up"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('nav.settings')}</h3>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Language selector */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-gray-500" />
              <label htmlFor="language-select" className="text-sm text-gray-600">{t('nav.language')}</label>
            </div>
            <select
              id="language-select"
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {t(`language.${lang}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Settings link */}
          <Link
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings size={16} />
            {t('nav.edit_profile')}
          </Link>
        </div>
      )}

      {/* Nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-colors ${
              menuOpen || location.pathname === '/settings' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Menu size={20} strokeWidth={menuOpen ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t('nav.more')}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
