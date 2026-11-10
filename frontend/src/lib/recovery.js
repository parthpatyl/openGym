import { MUSCLES, musclesOf } from './muscles.js'
import { EXIDX } from './exercises.js'

/**
 * Calculates recovery status for each muscle group based on workout history.
 * Standard recovery baseline:
 * - 0 - 24 hours: Fatigued (0 - 50% recovered) -> 'fatigued' (red)
 * - 24 - 48 hours: Recovering (50 - 99% recovered) -> 'recovering' (amber)
 * - 48+ hours: Ready / fully recovered -> 'ready' (green)
 */
export function calculateMuscleRecovery(workouts = [], now = Date.now()) {
  const lastTrained = {}
  MUSCLES.forEach(m => { lastTrained[m] = 0 })

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const recentWorkouts = (workouts || []).filter(w => (w.end || w.start) >= sevenDaysAgo)

  recentWorkouts.forEach(w => {
    const time = w.end || w.start || 0
    ;(w.entries || []).forEach(e => {
      const doneSets = (e.sets || []).filter(s => s.done).length
      if (doneSets === 0) return
      const ex = EXIDX[e.id]
      if (!ex) return
      const trained = musclesOf(ex)
      for (const slug in trained) {
        if (lastTrained[slug] !== undefined && time > lastTrained[slug]) {
          lastTrained[slug] = time
        }
      }
    })
  })

  const byMuscle = {}
  const colorMap = {}
  const fatigued = []
  const recovering = []
  const ready = []

  MUSCLES.forEach(slug => {
    const trainedAt = lastTrained[slug]
    if (!trainedAt) {
      byMuscle[slug] = { status: 'ready', pct: 100, hoursAgo: null, hoursLeft: 0 }
      colorMap[slug] = 'rec-ready'
      ready.push(slug)
      return
    }

    const elapsedHours = (now - trainedAt) / (1000 * 60 * 60)
    if (elapsedHours < 24) {
      const pct = Math.min(50, Math.max(10, Math.round((elapsedHours / 48) * 100)))
      const hoursLeft = Math.ceil(48 - elapsedHours)
      byMuscle[slug] = { status: 'fatigued', pct, hoursAgo: Math.round(elapsedHours), hoursLeft }
      colorMap[slug] = 'rec-fatigued'
      fatigued.push({ slug, pct, hoursLeft })
    } else if (elapsedHours < 48) {
      const pct = Math.min(99, Math.max(50, Math.round((elapsedHours / 48) * 100)))
      const hoursLeft = Math.ceil(48 - elapsedHours)
      byMuscle[slug] = { status: 'recovering', pct, hoursAgo: Math.round(elapsedHours), hoursLeft }
      colorMap[slug] = 'rec-recovering'
      recovering.push({ slug, pct, hoursLeft })
    } else {
      byMuscle[slug] = { status: 'ready', pct: 100, hoursAgo: Math.round(elapsedHours), hoursLeft: 0 }
      colorMap[slug] = 'rec-ready'
      ready.push(slug)
    }
  })

  return {
    byMuscle,
    colorMap,
    fatigued,
    recovering,
    ready
  }
}
