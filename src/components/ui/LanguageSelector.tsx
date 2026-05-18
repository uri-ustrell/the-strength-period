import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const LANGUAGES = ['ca', 'es', 'en'] as const

export const LanguageSelector = () => {
  const { i18n, t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLang = i18n.language?.substring(0, 2) ?? 'en'

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang)
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="fixed top-4 right-4 z-50">
      {isOpen && (
        <div className="absolute top-12 right-0 bg-surface rounded-lg shadow-lg border border-border-subtle py-1 min-w-[140px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleChange(lang)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-elevated transition-colors ${
                currentLang === lang ? 'font-semibold text-accent' : 'text-text-primary'
              }`}
            >
              {t(`language.${lang}`)}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border-subtle rounded-full shadow-md hover:shadow-lg hover:border-border-strong transition-all text-sm font-medium text-text-primary"
        aria-label={t(`language.${currentLang}`)}
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{currentLang}</span>
      </button>
    </div>
  )
}
