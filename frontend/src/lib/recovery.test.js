import { describe, it, expect } from 'vitest'
import { calculateMuscleRecovery } from './recovery.js'

describe('calculateMuscleRecovery', () => {
  it('marks all muscles ready when no workouts exist', () => {
    const res = calculateMuscleRecovery([])
    expect(res.ready.length).toBeGreaterThan(0)
    expect(res.fatigued.length).toBe(0)
    expect(res.recovering.length).toBe(0)
    expect(res.byMuscle.chest.status).toBe('ready')
    expect(res.byMuscle.chest.pct).toBe(100)
    expect(res.colorMap.chest).toBe('rec-ready')
  })

  it('marks chest and triceps fatigued when bench press was done 5 hours ago', () => {
    const now = Date.now()
    const fiveHoursAgo = now - 5 * 60 * 60 * 1000

    const workouts = [{
      start: fiveHoursAgo - 3600000,
      end: fiveHoursAgo,
      entries: [
        { id: '0025', sets: [{ w: 100, r: 10, done: true }] }
      ]
    }]

    const res = calculateMuscleRecovery(workouts, now)
    expect(res.byMuscle.chest.status).toBe('fatigued')
    expect(res.colorMap.chest).toBe('rec-fatigued')
    expect(res.byMuscle.triceps.status).toBe('fatigued')
    expect(res.byMuscle.chest.hoursLeft).toBeGreaterThan(0)
  })

  it('marks muscles recovering between 24 and 48 hours', () => {
    const now = Date.now()
    const thirtyHoursAgo = now - 30 * 60 * 60 * 1000

    const workouts = [{
      start: thirtyHoursAgo - 3600000,
      end: thirtyHoursAgo,
      entries: [
        { id: '0025', sets: [{ w: 100, r: 10, done: true }] }
      ]
    }]

    const res = calculateMuscleRecovery(workouts, now)
    expect(res.byMuscle.chest.status).toBe('recovering')
    expect(res.colorMap.chest).toBe('rec-recovering')
    expect(res.byMuscle.chest.pct).toBeGreaterThanOrEqual(50)
  })

  it('marks muscles ready after 48 hours', () => {
    const now = Date.now()
    const fiftyHoursAgo = now - 50 * 60 * 60 * 1000

    const workouts = [{
      start: fiftyHoursAgo - 3600000,
      end: fiftyHoursAgo,
      entries: [
        { id: '0025', sets: [{ w: 100, r: 10, done: true }] }
      ]
    }]

    const res = calculateMuscleRecovery(workouts, now)
    expect(res.byMuscle.chest.status).toBe('ready')
    expect(res.colorMap.chest).toBe('rec-ready')
    expect(res.byMuscle.chest.hoursLeft).toBe(0)
  })
})
