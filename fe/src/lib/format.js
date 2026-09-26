/**
 * Format an ISO timestamp for display. Returns an empty string for missing or
 * unparseable values so the UI never renders "Invalid Date".
 *
 * @param {string|number|Date|null|undefined} value
 * @returns {string}
 */
export function formatTimestamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default formatTimestamp
