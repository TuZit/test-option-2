import { describe, expect, it, vi } from 'vitest'
import { createHttpTaskService } from './httpTaskService'

/** Minimal stand-in for a fetch `Response`, so tests need no DOM/global fetch. */
function stubResponse({ status = 200, body } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: vi.fn(async () => body),
  }
}

function createService(responses, options = {}) {
  const fetchImpl = vi.fn()
  for (const response of responses) {
    fetchImpl.mockResolvedValueOnce(response)
  }
  const service = createHttpTaskService({
    baseUrl: 'http://api.test',
    userId: 'user-a',
    fetchImpl,
    ...options,
  })
  return { service, fetchImpl }
}

const sampleTask = {
  id: 'task-1',
  title: 'Write tests',
  description: '',
  status: 'open',
  createdAt: '2026-09-25T10:00:00.000Z',
  updatedAt: '2026-09-25T10:00:00.000Z',
}

describe('createHttpTaskService', () => {
  it('requires a userId', () => {
    expect(() => createHttpTaskService({ fetchImpl: vi.fn() })).toThrow(/userId/)
  })

  it('lists tasks with the dev-auth header and no status filter when omitted', async () => {
    const { service, fetchImpl } = createService([stubResponse({ body: [sampleTask] })])

    await expect(service.listTasks()).resolves.toEqual([sampleTask])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://api.test/tasks')
    expect(init.method).toBeUndefined()
    expect(init.headers['X-User-Id']).toBe('user-a')
  })

  it('treats "all" as no filter and sends open/done as a query parameter', async () => {
    const { service, fetchImpl } = createService([
      stubResponse({ body: [] }),
      stubResponse({ body: [] }),
    ])

    await service.listTasks('all')
    await service.listTasks('done')

    expect(fetchImpl.mock.calls[0][0]).toBe('http://api.test/tasks')
    expect(fetchImpl.mock.calls[1][0]).toBe('http://api.test/tasks?status=done')
  })

  it('creates a task with POST and a JSON body', async () => {
    const { service, fetchImpl } = createService([stubResponse({ status: 201, body: sampleTask })])

    await expect(service.createTask({ title: 'Write tests' })).resolves.toEqual(sampleTask)

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://api.test/tasks')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ title: 'Write tests', description: '' })
  })

  it('updates a task with PUT and URL-encodes the id', async () => {
    const { service, fetchImpl } = createService([stubResponse({ body: { ...sampleTask, status: 'done' } })])

    await service.updateTask('task/1', { status: 'done' })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://api.test/tasks/task%2F1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ status: 'done' })
  })

  it('deletes a task with DELETE and resolves undefined for 204', async () => {
    const { service, fetchImpl } = createService([stubResponse({ status: 204 })])

    await expect(service.deleteTask('task-1')).resolves.toBeUndefined()

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://api.test/tasks/task-1')
    expect(init.method).toBe('DELETE')
  })

  it('throws the backend error message on failure', async () => {
    const { service } = createService([
      stubResponse({ status: 404, body: { error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } } }),
    ])

    await expect(service.updateTask('missing', { title: 'x' })).rejects.toThrow(
      /404.*TASK_NOT_FOUND: Task not found/,
    )
  })

  it('throws a generic error when the failure body is not JSON', async () => {
    const { service } = createService([
      {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(async () => {
          throw new Error('not json')
        }),
      },
    ])

    await expect(service.listTasks()).rejects.toThrow(/500.*Internal Server Error/)
  })
})
