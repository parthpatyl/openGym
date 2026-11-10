import { describe, it, expect } from 'vitest'
import {
  primaryMuscleOf,
  groupExercisesByMuscle,
  suggestMergedName,
  cloneSelectedExercises,
  mergeRoutines
} from './routine-merge.js'

describe('routine-merge', () => {
  // Push Day exercises from starter:
  // '0025': Barbell Bench Press (Chest)
  // '0047': Barbell Incline Bench Press (Chest)
  // '0426': Dumbbell Lateral Raise (Shoulders)
  // '0334': Cable Triceps Pushdown (Triceps)
  const pushRoutine = {
    id: 'push-1',
    name: 'Chest and Tricep',
    emoji: 'barbell',
    prog: 'linear',
    ex: [
      { id: '0025', sets: 4, reps: 8, weight: 80 },
      { id: '0047', sets: 3, reps: 10, weight: 60 },
      { id: '0241', sets: 3, reps: 12, weight: 25 }
    ]
  }

  // Pull Day exercises:
  // '0027': Barbell Bent Over Row (Upper back)
  // '0031': Barbell Bicep Curl (Biceps)
  const pullRoutine = {
    id: 'pull-1',
    name: 'Back and Bicep',
    emoji: 'pullup',
    prog: 'double',
    ex: [
      { id: '0027', sets: 4, reps: 8, weight: 70 },
      { id: '0031', sets: 3, reps: 10, weight: 30 }
    ]
  }

  it('determines primary muscle for exercises', () => {
    const chestEx = primaryMuscleOf('0025')
    expect(chestEx.slug).toBe('chest')
    expect(chestEx.name).toBe('Chest')

    const bicepEx = primaryMuscleOf('0031')
    expect(bicepEx.slug).toBe('biceps')
    expect(bicepEx.name).toBe('Biceps')
  })

  it('groups exercises by muscle', () => {
    const groups = groupExercisesByMuscle(pushRoutine)
    expect(groups.length).toBe(2)
    const chestGroup = groups.find(g => g.slug === 'chest')
    expect(chestGroup).toBeDefined()
    expect(chestGroup.indices).toEqual([0, 1])

    const tricepGroup = groups.find(g => g.slug === 'triceps')
    expect(tricepGroup).toBeDefined()
    expect(tricepGroup.indices).toEqual([2])
  })

  it('suggests intuitive merged name based on selected muscles', () => {
    // Select chest exercises (0, 1) from push and bicep (1) from pull
    const name = suggestMergedName(pushRoutine, [0, 1], pullRoutine, [1])
    expect(name).toBe('Chest & Biceps')
  })

  it('falls back to routine names when muscles cannot be determined', () => {
    const emptyA = { name: 'Split A', ex: [] }
    const emptyB = { name: 'Split B', ex: [] }
    const name = suggestMergedName(emptyA, [], emptyB, [])
    expect(name).toBe('Split A + Split B')
  })

  it('clones selected exercises preserving configurations', () => {
    const cloned = cloneSelectedExercises(pushRoutine, [0, 2])
    expect(cloned.length).toBe(2)
    expect(cloned[0].id).toBe('0025')
    expect(cloned[0].weight).toBe(80)
    expect(cloned[1].id).toBe('0241')
    expect(cloned[1].reps).toBe(12)
  })

  it('handles supersets: keeps group if all partners selected, unlinks if only one', () => {
    const routineWithSS = {
      id: 'ss-routine',
      name: 'Superset Split',
      ex: [
        { id: '0025', sets: 3, reps: 10, sg: 'sg1' },
        { id: '0047', sets: 3, reps: 10, sg: 'sg1' },
        { id: '0334', sets: 3, reps: 12, sg: 'sg2' }
      ]
    }

    // Select both items of sg1: superset should be preserved with new sg id
    const clonedBoth = cloneSelectedExercises(routineWithSS, [0, 1])
    expect(clonedBoth.length).toBe(2)
    expect(clonedBoth[0].sg).toBeDefined()
    expect(clonedBoth[0].sg).toBe(clonedBoth[1].sg)
    expect(clonedBoth[0].sg).not.toBe('sg1') // fresh uid

    // Select only one item of sg1: superset should be cleared
    const clonedOne = cloneSelectedExercises(routineWithSS, [0, 2])
    expect(clonedOne.length).toBe(2)
    expect(clonedOne[0].sg).toBeUndefined()
    expect(clonedOne[1].sg).toBeUndefined()
  })

  it('merges selected exercises from two splits into a complete routine', () => {
    const result = mergeRoutines({
      routineA: pushRoutine,
      selectedIndicesA: [0, 1], // Chest exercises
      routineB: pullRoutine,
      selectedIndicesB: [1],    // Bicep exercise
      name: '',
      emoji: 'arm'
    })

    expect(result.name).toBe('Chest & Biceps')
    expect(result.emoji).toBe('arm')
    expect(result.merged).toBe(true)
    expect(result.ex.length).toBe(3)
    expect(result.ex[0].id).toBe('0025')
    expect(result.ex[1].id).toBe('0047')
    expect(result.ex[2].id).toBe('0031')
    expect(result.id).toBeDefined()
  })
})
