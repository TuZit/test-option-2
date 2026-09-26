/**
 * Tiny `clsx`-style class name composer used by the local UI primitives.
 * Keeps the component layer dependency-free.
 *
 * @param {...unknown} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  const classes = []

  for (const input of inputs) {
    if (!input) continue

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
      continue
    }

    if (Array.isArray(input)) {
      const nested = cn(...input)
      if (nested) classes.push(nested)
      continue
    }

    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key)
      }
    }
  }

  return classes.join(' ')
}

export default cn
