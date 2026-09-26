/**
 * Task service — real HTTP implementation of the same boundary as the
 * in-memory mock in `taskService.js`.
 *
 * It mirrors the backend contract exactly:
 *
 *   POST   /tasks                  -> createTask(input)
 *   GET    /tasks?status=open|done -> listTasks(status)
 *   PUT    /tasks/:id              -> updateTask(id, patch)
 *   DELETE /tasks/:id              -> deleteTask(id)
 *
 * The current user is sent in the `X-User-Id` header, which is the backend's
 * development authentication mechanism. Swap this header for a real token when
 * the backend moves to session/JWT auth.
 *
 * Task shape: { id, title, description, status, createdAt, updatedAt }.
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:3003'

function trimTrailingSlashes(value) {
  return String(value).replace(/\/+$/, '')
}

/** Builds an Error carrying the backend's `{ error: { code, message } }` detail. */
async function requestError(response) {
  let code = ''
  let message = ''
  try {
    const body = await response.json()
    code = body?.error?.code ?? ''
    message = body?.error?.message ?? ''
  } catch {
    // The response had no JSON body; fall back to the status line.
  }
  const detail = message ? `${code ? `${code}: ` : ''}${message}` : response.statusText || 'Request failed'
  return new Error(`Task API responded with ${response.status} — ${detail}`)
}

async function ensureOk(response) {
  if (!response.ok) {
    throw await requestError(response)
  }
  return response
}

/**
 * @param {object} options
 * @param {string} [options.baseUrl] Backend origin, e.g. `http://127.0.0.1:3003`.
 * @param {string} options.userId Current user's identity (`X-User-Id`).
 * @param {typeof fetch} [options.fetchImpl] Override for tests.
 */
export function createHttpTaskService(options = {}) {
  const { baseUrl = DEFAULT_BASE_URL, userId, fetchImpl } = options

  if (!userId) {
    throw new Error('createHttpTaskService requires a `userId`.')
  }
  const request = fetchImpl ?? globalThis.fetch
  if (typeof request !== 'function') {
    throw new Error('No fetch implementation is available.')
  }

  const root = trimTrailingSlashes(baseUrl)

  function buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    }
  }

  /**
   * @param {'all'|'open'|'done'} [status]
   * @returns {Promise<Array<object>>}
   */
  async function listTasks(status) {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
    const response = await ensureOk(await request(`${root}/tasks${query}`, { headers: buildHeaders() }))
    return response.json()
  }

  /**
   * @param {{ title: string, description?: string }} input
   * @returns {Promise<object>}
   */
  async function createTask(input = {}) {
    const response = await ensureOk(
      await request(`${root}/tasks`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ title: input.title, description: input.description ?? '' }),
      }),
    )
    return response.json()
  }

  /**
   * @param {string} id
   * @param {{ title?: string, description?: string, status?: string }} patch
   * @returns {Promise<object>}
   */
  async function updateTask(id, patch = {}) {
    const response = await ensureOk(
      await request(`${root}/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify(patch),
      }),
    )
    return response.json()
  }

  /**
   * @param {string} id
   * @returns {Promise<object|undefined>}
   */
  async function deleteTask(id) {
    const response = await ensureOk(
      await request(`${root}/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      }),
    )
    if (response.status === 204) return undefined
    return response.json().catch(() => undefined)
  }

  return { listTasks, createTask, updateTask, deleteTask }
}

export default createHttpTaskService
