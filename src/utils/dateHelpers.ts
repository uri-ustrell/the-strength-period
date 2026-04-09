import type { ExecutedSession } from '@/types/session'

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getTodayDow(): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const js = new Date().getDay()
  return (js === 0 ? 7 : js) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

export function getSessionDate(
  mesocycleStartDate: string,
  weekNumber: number,
  dayOfWeek: number
): Date {
  const start = new Date(mesocycleStartDate)
  // Find the Monday of the week containing startDate
  const startDow = start.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = startDow === 0 ? -6 : 1 - startDow
  const weekOneMonday = new Date(start)
  weekOneMonday.setDate(weekOneMonday.getDate() + mondayOffset)

  // dayOfWeek: 1=Monday .. 7=Sunday (ISO)
  const daysOffset = (weekNumber - 1) * 7 + (dayOfWeek - 1)
  const d = new Date(weekOneMonday)
  d.setDate(d.getDate() + daysOffset)
  return d
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function calculateStreak(sessions: ExecutedSession[]): number {
  const completedDates = new Set(
    sessions.filter((s) => !s.skipped && s.completedAt).map((s) => s.date)
  )
  let streak = 0
  const today = new Date()
  const todayStr = toDateStr(today)
  const startOffset = completedDates.has(todayStr) ? 0 : 1

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (completedDates.has(toDateStr(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}
