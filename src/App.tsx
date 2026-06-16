import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '@/components/ui/BottomNav'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserStore } from '@/stores/userStore'

// Routes are code-split so the initial bundle excludes per-page deps
// (e.g. recharts on Stats). Pages use named exports, so map them to `default`.
const Landing = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.Landing })))
const Onboarding = lazy(() => import('@/pages/Onboarding').then((m) => ({ default: m.Onboarding })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Planning = lazy(() => import('@/pages/Planning').then((m) => ({ default: m.Planning })))
const Session = lazy(() => import('@/pages/Session').then((m) => ({ default: m.Session })))
const Stats = lazy(() => import('@/pages/Stats').then((m) => ({ default: m.Stats })))
const SettingsPage = lazy(() =>
  import('@/pages/Settings').then((m) => ({ default: m.SettingsPage }))
)

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center text-indigo-600">
    <LoadingSpinner size={32} />
  </div>
)

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted)
  const isLoading = useUserStore((s) => s.isLoading)
  const loadOnboardingStatus = useUserStore((s) => s.loadOnboardingStatus)

  useEffect(() => {
    loadOnboardingStatus()
  }, [loadOnboardingStatus])

  useEffect(() => {
    if (isLoading) return
    const publicPaths = ['/', '/onboarding']
    const isPublic = publicPaths.includes(location.pathname)

    if (!onboardingCompleted && !isPublic) {
      navigate('/onboarding', { replace: true })
    }
  }, [onboardingCompleted, isLoading, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}

export const App = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <OnboardingGuard>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/session" element={<Session />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>
          <BottomNav />
        </OnboardingGuard>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
