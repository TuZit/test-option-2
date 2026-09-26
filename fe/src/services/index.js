/**
 * Chooses the task service the app uses by default.
 *
 * - When `VITE_API_BASE_URL` is set, the real HTTP client is used and requests
 *   are sent with `X-User-Id: VITE_USER_ID` (default `user-a`).
 * - Otherwise the app keeps using the in-memory mock, so it runs standalone.
 *
 * Components are unaffected either way: they only receive the injected
 * `service` prop, which exposes the same four methods.
 */
import { createHttpTaskService } from './httpTaskService'
import { taskService as mockTaskService } from './taskService'

const env = import.meta.env ?? {}
const apiBaseUrl = env.VITE_API_BASE_URL?.trim()
const userId = env.VITE_USER_ID?.trim() || 'user-a'

export const taskService = apiBaseUrl
  ? createHttpTaskService({ baseUrl: apiBaseUrl, userId })
  : mockTaskService

export { createHttpTaskService }
export default taskService
