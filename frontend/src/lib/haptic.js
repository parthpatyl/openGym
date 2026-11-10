// Haptic feedback utility for mobile touch interactions
export function haptic(type = 'light') {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (type === 'light') {
        navigator.vibrate(12)
      } else if (type === 'medium') {
        navigator.vibrate(25)
      } else if (type === 'success') {
        navigator.vibrate([15, 40, 20])
      } else if (typeof type === 'number') {
        navigator.vibrate(type)
      }
    }
  } catch (e) {
    // Non-blocking fallback for unsupported devices or silent mode
  }
}
