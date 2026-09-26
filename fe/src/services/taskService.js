/**
 * Task service — in-memory mock implementation.
 *
 * This module is the single boundary between the UI and task persistence. It
 * mirrors the backend contract that the real implementation must satisfy:
 *
 *   POST   /tasks                 -> createTask(input)
 *   GET    /tasks?status=open|done -> listTasks(status)
 *   PUT    /tasks/:id             -> updateTask(id, patch)
 *   DELETE /tasks/:id             -> deleteTask(id)
 *
 * Task shape: { id, title, description, status, createdAt, updatedAt }
 * status is always `'open'` or `'done'`, and new tasks default to `'open'`.
 *
 * To connect a real API later, replace the body of these methods (or pass a
 * different implementation to consumers) while keeping the method names, the
 * promise-based signatures, and the task shape unchanged.
 */

export const TASK_STATUS = Object.freeze({ OPEN: 'open', DONE: 'done' })

export const TASK_STATUSES = Object.freeze([TASK_STATUS.OPEN, TASK_STATUS.DONE])

let idSequence = 0

/**
 * Generate a collision-resistant id without relying on crypto being present.
 * @returns {string}
 */
function generateId() {
  idSequence += 1
  return `task_${Date.now().toString(36)}_${idSequence.toString(36)}`
}

function nowIso() {
  return new Date().toISOString()
}

function cloneTask(task) {
  return { ...task }
}

function cloneTasks(tasks) {
  return tasks.map(cloneTask)
}

function assertKnownStatus(status) {
  if (!TASK_STATUSES.includes(status)) {
    throw new Error(`Unsupported task status: ${status}`)
  }
}

function normalizeTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required.')
  }
  return title.trim()
}

function normalizeDescription(description) {
  if (description === undefined || description === null) return ''
  return String(description).trim()
}

function normalizeSeedTask(seed, index) {
  const timestamp = seed.createdAt ?? nowIso()
  return {
    id: seed.id ?? `seed_${index + 1}`,
    title: normalizeTitle(seed.title),
    description: normalizeDescription(seed.description),
    status: seed.status ?? TASK_STATUS.OPEN,
    createdAt: timestamp,
    updatedAt: seed.updatedAt ?? timestamp,
  }
}

/** A small, realistic default data set so the demo page is not empty. */
export const DEFAULT_SEED_TASKS = Object.freeze([
  {
    id: 'seed_1',
    title: 'Review the assessment requirements',
    description: 'Read the brief end to end before writing any code.',
    status: TASK_STATUS.DONE,
    createdAt: '2026-09-25T09:00:00.000Z',
    updatedAt: '2026-09-25T09:45:00.000Z',
  },
  {
    id: 'seed_2',
    title: 'Build the task service boundary',
    description: 'Keep persistence behind an async, replaceable interface.',
    status: TASK_STATUS.OPEN,
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
  },
  {
    id: 'seed_3',
    title: 'Write component and page tests',
    description: '',
    status: TASK_STATUS.OPEN,
    createdAt: '2026-09-25T11:00:00.000Z',
    updatedAt: '2026-09-25T11:30:00.000Z',
  },
])

/**
 * Create an independent in-memory task service.
 *
 * @param {object} [options]
 * @param {Array<object>} [options.seedTasks] Initial tasks for this instance.
 * @param {false|'create'|'list'|'update'|'toggle'|'delete'|Function} [options.failureMode]
 *   Deterministic failure hook used by rollback tests. `'toggle'` rejects only
 *   updates that change `status`; each other string rejects that operation.
 *   A function receives the operation name and returns true to reject.
 * @param {() => string} [options.generateId] Id factory override.
 * @returns {{
 *   listTasks: (status?: string) => Promise<Array<object>>,
 *   createTask: (input: { title: string, description?: string }) => Promise<object>,
 *   updateTask: (id: string, patch: object) => Promise<object>,
 *   deleteTask: (id: string) => Promise<object>,
 * }}
 */
export function createTaskService(options = {}) {
  const {
    seedTasks = DEFAULT_SEED_TASKS,
    failureMode = false,
    generateId: makeId = generateId,
  } = options

  let tasks = seedTasks.map(normalizeSeedTask)

  function shouldFail(operation, context) {
    if (!failureMode) return false
    if (typeof failureMode === 'function') return Boolean(failureMode(operation, context))
    if (failureMode === 'toggle') {
      return operation === 'update' && Boolean(context?.patch && 'status' in context.patch)
    }
    return failureMode === operation
  }

  function fail(operation) {
    throw new Error(`Mock task service failed to ${operation} the task.`)
  }

  function findIndex(id) {
    const index = tasks.findIndex((task) => task.id === id)
    if (index === -1) {
      throw new Error(`Task not found: ${id}`)
    }
    return index
  }

  /**
   * @param {'all'|'open'|'done'} [status]
   * @returns {Promise<Array<object>>}
   */
  async function listTasks(status) {
    if (shouldFail('list', { status })) fail('list')
    if (status === undefined || status === null || status === 'all') {
      return cloneTasks(tasks)
    }
    assertKnownStatus(status)
    return cloneTasks(tasks.filter((task) => task.status === status))
  }

  /**
   * @param {{ title: string, description?: string, status?: string }} input
   * @returns {Promise<object>}
   */
  async function createTask(input = {}) {
    if (shouldFail('create', { input })) fail('create')
    const timestamp = nowIso()
    const task = {
      id: makeId(),
      title: normalizeTitle(input.title),
      description: normalizeDescription(input.description),
      status: input.status ?? TASK_STATUS.OPEN,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    assertKnownStatus(task.status)
    tasks = [...tasks, task]
    return cloneTask(task)
  }

  /**
   * @param {string} id
   * @param {{ title?: string, description?: string, status?: string }} patch
   * @returns {Promise<object>}
   */
  async function updateTask(id, patch = {}) {
    if (shouldFail('update', { id, patch })) fail('update')
    const index = findIndex(id)
    const current = tasks[index]
    const next = {
      ...current,
      updatedAt: nowIso(),
    }
    if ('title' in patch) next.title = normalizeTitle(patch.title)
    if ('description' in patch) next.description = normalizeDescription(patch.description)
    if ('status' in patch) {
      assertKnownStatus(patch.status)
      next.status = patch.status
    }
    tasks = tasks.map((task, taskIndex) => (taskIndex === index ? next : task))
    return cloneTask(next)
  }

  /**
   * @param {string} id
   * @returns {Promise<object>} the removed task
   */
  async function deleteTask(id) {
    if (shouldFail('delete', { id })) fail('delete')
    const index = findIndex(id)
    const [removed] = tasks.slice(index, index + 1)
    tasks = tasks.filter((_, taskIndex) => taskIndex !== index)
    return cloneTask(removed)
  }

  return { listTasks, createTask, updateTask, deleteTask }
}

/** Default shared instance used by the app. */
export const taskService = createTaskService()

export default taskService
