// Motion tokens for framer-motion — the same values as --motion-* / --ease-standard in
// globals.css. Reduced motion is handled once, by <MotionConfig reducedMotion="user">.
export const EASE_STANDARD = [0.2, 0, 0, 1] as const
export const MOTION_FAST = 0.12
export const MOTION_BASE = 0.2

/** Step content entering: crossfade + 8px rise. */
export const stepEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_BASE, ease: EASE_STANDARD },
}

/** A landing card arriving: fade + 12px rise, once. */
export const cardEnter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION_BASE, ease: EASE_STANDARD },
}
