export interface LoadingSpinnerProps {
  size?: number
  /** Accessible name for the spinner. Pass a translated string from callers. */
  label?: string
}

export const LoadingSpinner = ({ size = 20, label = 'Loading' }: LoadingSpinnerProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    role="img"
    aria-label={label}
    className="animate-spin"
  >
    <title>{label}</title>
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="opacity-25"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="opacity-75"
    />
  </svg>
)
