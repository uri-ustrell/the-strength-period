import { useTranslation } from 'react-i18next'
import type { AestheticVariant } from '@/types/user'

const VARIANTS: ReadonlyArray<{ key: AestheticVariant; i18nKey: 'classic_boring' | 'retro_platformer' }> = [
  { key: 'classic-boring', i18nKey: 'classic_boring' },
  { key: 'retro-platformer', i18nKey: 'retro_platformer' },
]

type Props = {
  /** Currently effective variant (may be the reduced-motion override). */
  effectiveVariant: AestheticVariant
  /** Persisted user choice — kept even when overridden by reduced motion. */
  persistedVariant: AestheticVariant
  onChange: (variant: AestheticVariant) => void
  /** When true, the OS forces classic-boring. Inputs are disabled and a notice is shown. */
  reducedMotionForced: boolean
  /**
   * Translation namespace that hosts `appearance.*` keys. Both the `common`
   * (Settings) and `onboarding` namespaces ship the same surface copy.
   */
  namespace: 'common' | 'onboarding'
  /** Settings nests its keys under `settings.appearance.*`; onboarding under `appearance.*`. */
  keyPrefix: 'settings.appearance' | 'appearance'
}

/**
 * Appearance / aesthetic-variant radio group.
 *
 * Honors the `prefers-reduced-motion` runtime override:
 * - When forced, every option except `classic-boring` is disabled.
 * - The persisted choice is still indicated (radio remains checked) so that
 *   restoring OS preferences cleanly restores it.
 * - The component never writes to the store on its own.
 */
export const AppearanceSelector = ({
  effectiveVariant,
  persistedVariant,
  onChange,
  reducedMotionForced,
  namespace,
  keyPrefix,
}: Props) => {
  const { t } = useTranslation(namespace)

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">{t(`${keyPrefix}.subtitle`)}</p>

      {reducedMotionForced && (
        <div
          role="status"
          className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {t(`${keyPrefix}.reduced_motion_forced`)}
        </div>
      )}

      <div role="radiogroup" aria-label={t(`${keyPrefix}.title`)} className="space-y-2">
        {VARIANTS.map((variant) => {
          const checked = persistedVariant === variant.key
          const isEffective = effectiveVariant === variant.key
          const disabled = reducedMotionForced && variant.key !== 'classic-boring'
          const labelId = `appearance-variant-label-${variant.key}`
          const descId = `appearance-variant-desc-${variant.key}`
          return (
            <label
              key={variant.key}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${
                checked
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="aesthetic-variant"
                value={variant.key}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(variant.key)}
                aria-labelledby={labelId}
                aria-describedby={descId}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              {/* Thumbnail placeholder — replaced when variant skins land. */}
              <div
                aria-hidden="true"
                className="h-12 w-12 shrink-0 rounded-md border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200"
              />
              <div className="flex-1">
                <div id={labelId} className="text-sm font-semibold text-gray-900">
                  {t(`${keyPrefix}.variant.${variant.i18nKey}.label`)}
                  {isEffective && reducedMotionForced && variant.key === 'classic-boring' && (
                    <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                      ●
                    </span>
                  )}
                </div>
                <div id={descId} className="mt-1 text-xs text-gray-500">
                  {t(`${keyPrefix}.variant.${variant.i18nKey}.description`)}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500">{t(`${keyPrefix}.shared_core_notice`)}</p>
    </div>
  )
}
