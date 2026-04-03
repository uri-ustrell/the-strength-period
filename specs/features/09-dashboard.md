# Feature 09 — Dashboard + Stats

## Dependencies
Steps 4 (IndexedDB), 7 (Planning), 8 (Execution) must be complete.

## Acceptance Criteria
- [ ] Dashboard shows greeting + date + training streak
- [ ] "Today" block: planned session preview or quick generation option
- [ ] Weekly view: 7 days, planned vs completed sessions
- [ ] Weekly load indicator (accumulated)
- [ ] Plan creation flow: preset selection → config → AI generation → preview → save
- [ ] Week view and month view for active mesocycle
- [ ] Stats page: period selector (week/month/all)
- [ ] Volume chart by muscle group (stacked area, Recharts)
- [ ] Progression chart by exercise (line, Recharts)
- [ ] Adherence chart (weekly bars, Recharts)
- [ ] PR tracker table (best marks per exercise)
- [ ] Export/Import data buttons

## Files to Create

```
src/pages/Dashboard.tsx
src/pages/Planning.tsx
src/pages/Stats.tsx
src/components/planning/PlanCreator.tsx
src/components/planning/WeekView.tsx
src/components/planning/MonthView.tsx
src/components/planning/SessionPreview.tsx
src/components/stats/VolumeChart.tsx
src/components/stats/ProgressionChart.tsx
src/components/stats/AdherenceChart.tsx
```

## Dashboard Layout

```
Header: "Hola, [nom]" + date + 🔥 streak count

Block 1: "Avui"
  - If session planned today → preview card + "Comença" button
  - If no session → "Genera una sessió ràpida" (input: minutes + muscle groups)
  - Weekly load bar (accumulated sets this week)

Block 2: "El teu pla"
  - Compact 7-day week view (colored dots: planned/completed/skipped)
  - CTA: "Veure pla complet" / "Crear nou pla"

Block 3: "Últimes 4 setmanes"
  - Mini volume bars per muscle group
  - Adherence percentage
  - Main lift progression number
```

## Plan Creation Flow (PlanCreator.tsx)

```
1. Select preset (6 cards: 5 presets + "Personalitzat")
2. Configure: duration weeks, days/week, minutes/session, extra restrictions
3. "Genera" → loading animation → Claude API call
4. Preview: week-by-week with load progression visible
5. "Desa el pla" → write to IndexedDB mesocycles
```

## Stats Data Aggregation

Read from IndexedDB `executedSets` and `sessions` stores:
- Volume per muscle group per week → VolumeChart (AreaChart stacked)
- Weight per exercise over time → ProgressionChart (LineChart, exercise selectable)
- Sessions completed vs planned per week → AdherenceChart (BarChart)
- Max weight × reps per exercise → PR table
