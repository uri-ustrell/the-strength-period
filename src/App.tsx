import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Landing } from '@/pages/Landing'
import { Onboarding } from '@/pages/Onboarding'
import { Dashboard } from '@/pages/Dashboard'
import { Planning } from '@/pages/Planning'
import { Session } from '@/pages/Session'
import { Stats } from '@/pages/Stats'
import { SettingsPage } from '@/pages/Settings'
import { BottomNav } from '@/components/ui/BottomNav'
import { useUserStore } from '@/stores/userStore'

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
      <OnboardingGuard>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/session" element={<Session />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <BottomNav />
      </OnboardingGuard>
    </BrowserRouter>
  )
}
