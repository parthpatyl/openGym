import { EXIDX, exOr } from './exercises.js'
import { musclesOf, MUSCLE_NAME } from './muscles.js'
import { uid } from './format.js'
import { DEFAULT_GLYPH } from './glyphs.js'
import { cleanupSg } from './history.js'

const TG_ALIAS = {
  abs: 'abs', pectorals: 'chest', chest: 'chest', 'upper chest': 'chest',
  biceps: 'biceps', triceps: 'triceps',
  glutes: 'gluteal', gluteal: 'gluteal',
  delts: 'deltoids', shoulders: 'deltoids', 'rear deltoids': 'deltoids',
  'upper back': 'upper-back', lats: 'upper-back', rhomboids: 'upper-back', back: 'upper-back',
  calves: 'calves', quads: 'quadriceps', quadriceps: 'quadriceps',
  forearms: 'forearm', forearm: 'forearm',
  hamstrings: 'hamstring', hamstring: 'hamstring',
  spine: 'lower-back', 'lower back': 'lower-back',
  traps: 'trapezius', trapezius: 'trapezius',
  adductors: 'adductors', 'serratus anterior': 'serratus',
  obliques: 'obliques'
}

/**
 * Returns the primary muscle slug and display name for an exercise.
 * Strict primary target muscle categorization.
 */
export function primaryMuscleOf(idOrEx) {
  const ex = typeof idOrEx === 'string' ? exOr(idOrEx) : idOrEx
  if (!ex) return { slug: 'other', name: 'Other' }

  // Strict primary target muscle check
  const tgSlug = ex.tg ? TG_ALIAS[String(ex.tg).toLowerCase().trim()] : null
  if (tgSlug && MUSCLE_NAME[tgSlug]) {
    return { slug: tgSlug, name: MUSCLE_NAME[tgSlug] }
  }

  // Fallback to musclesOf if available
  const m = musclesOf(ex)
  let bestSlug = null
  let maxWeight = 0
  for (const slug in m) {
    if (m[slug] > maxWeight) {
      maxWeight = m[slug]
      bestSlug = slug
    }
  }
  if (bestSlug && MUSCLE_NAME[bestSlug]) {
    return { slug: bestSlug, name: MUSCLE_NAME[bestSlug] }
  }

  // Fallback to body part if available
  if (ex.bp) {
    const bpName = ex.bp.charAt(0).toUpperCase() + ex.bp.slice(1)
    return { slug: ex.bp.toLowerCase().replace(/\s+/g, '-'), name: bpName }
  }

  return { slug: 'other', name: 'Other' }
}

/**
 * Groups routine exercises by primary muscle group with indices.
 */
export function groupExercisesByMuscle(routine) {
  if (!routine || !Array.isArray(routine.ex)) return []

  const groups = {}
  routine.ex.forEach((entry, index) => {
    const ex = exOr(entry.id)
    const { slug, name } = primaryMuscleOf(ex)

    if (!groups[slug]) {
      groups[slug] = { slug, name, indices: [], exercises: [] }
    }
    groups[slug].indices.push(index)
    groups[slug].exercises.push({ entry, ex, index })
  })

  return Object.values(groups).sort((a, b) => b.indices.length - a.indices.length)
}

/**
 * Suggests a split name based on selected muscle groups or routine names.
 * Example: Chest from "Chest and Tricep" + Bicep from "Back and Bicep" -> "Chest & Biceps"
 */
export function suggestMergedName(routineA, selectedIndicesA, routineB, selectedIndicesB) {
  const getSelectedMuscleNames = (routine, indices) => {
    if (!routine || !indices || indices.length === 0) return []
    const muscles = new Set()
    indices.forEach(idx => {
      const entry = routine.ex[idx]
      if (entry) {
        const { name } = primaryMuscleOf(entry.id)
        if (name && name !== 'Other') muscles.add(name)
      }
    })
    return Array.from(muscles)
  }

  const musclesA = getSelectedMuscleNames(routineA, selectedIndicesA)
  const musclesB = getSelectedMuscleNames(routineB, selectedIndicesB)

  if (musclesA.length > 0 && musclesB.length > 0) {
    const partA = musclesA.slice(0, 2).join(' & ')
    const partB = musclesB.slice(0, 2).join(' & ')
    if (partA === partB) return partA
    return `${partA} & ${partB}`
  }

  if (musclesA.length > 0) return musclesA.join(' & ')
  if (musclesB.length > 0) return musclesB.join(' & ')

  const nameA = routineA?.name?.trim() || 'Split A'
  const nameB = routineB?.name?.trim() || 'Split B'
  return `${nameA} + ${nameB}`
}

/**
 * Clones selected exercises from a routine, mapping superset IDs to prevent collisions.
 */
export function cloneSelectedExercises(routine, selectedIndices) {
  if (!routine || !Array.isArray(routine.ex) || !selectedIndices || selectedIndices.length === 0) {
    return []
  }

  const selectedSet = new Set(selectedIndices)
  const sgMap = new Map()

  // First pass: identify valid supersets within the selected subset
  const sgCount = {}
  selectedIndices.forEach(idx => {
    const item = routine.ex[idx]
    if (item?.sg) {
      sgCount[item.sg] = (sgCount[item.sg] || 0) + 1
    }
  })

  // Second pass: clone exercises and re-tag supersets
  const cloned = []
  routine.ex.forEach((item, idx) => {
    if (!selectedSet.has(idx)) return

    const copy = JSON.parse(JSON.stringify(item))
    if (copy.sg) {
      // Only keep superset link if at least 2 exercises in this selection share it
      if (sgCount[copy.sg] > 1) {
        if (!sgMap.has(copy.sg)) {
          sgMap.set(copy.sg, 'sg' + uid())
        }
        copy.sg = sgMap.get(copy.sg)
      } else {
        delete copy.sg
      }
    }
    cloned.push(copy)
  })

  cleanupSg(cloned)
  return cloned
}

/**
 * Merges selected exercises from routine A and routine B into a new routine object.
 * Order: exercises selected from Split A (in original source order), followed by
 * exercises selected from Split B (in original source order).
 */
export function mergeRoutines({
  routineA,
  selectedIndicesA = [],
  routineB,
  selectedIndicesB = [],
  name = '',
  emoji = null,
  prog = null
}) {
  const clonedA = cloneSelectedExercises(routineA, selectedIndicesA)
  const clonedB = cloneSelectedExercises(routineB, selectedIndicesB)
  const mergedEx = [...clonedA, ...clonedB]
  cleanupSg(mergedEx)

  const finalName = name.trim() || suggestMergedName(routineA, selectedIndicesA, routineB, selectedIndicesB) || 'Merged Split'
  const finalEmoji = emoji || routineA?.emoji || routineB?.emoji || DEFAULT_GLYPH
  const finalProg = prog || routineA?.prog || routineB?.prog || 'linear'

  return {
    id: uid(),
    name: finalName,
    emoji: finalEmoji,
    prog: finalProg,
    ex: mergedEx,
    merged: true
  }
}
