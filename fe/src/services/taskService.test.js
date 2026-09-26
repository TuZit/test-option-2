import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTaskService } from './taskService'

const SEED = [
  {
    id: 't1',
    title: 'Write the plan',
    description: 'Draft the implementation plan.',
    status: 'open',
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:00:00.000Z',
  },
  {
    id: 't2',
    title: 'Review the design',
    description: '',
    status: 'done',
    createdAt: '2026-09-25T08:30:00.000Z',
    updatedAt: '2026-09-25T09:00:00.000Z',
  },
]

function freshService(options = {}) {
  return createTaskService({ seedTasks: SEED.map((task) => ({ ...task })), ...options })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('taskService.listTasks', () => {
  it('lists the seeded tasks', async () => {
    const service = freshService()

    const tasks = await service.listTasks()

    expect(tasks).toHaveLength(2)
    expect(tasks.map((task) => task.title)).toEqual(['Write the plan', 'Review the design'])
    expect(tasks[0]).toEqual(SEED[0])
  })

  it('filters tasks by open and done status', async () => {
    const service = freshService()

    const open = await service.listTasks('open')
    const done = await service.listTasks('done')
    const all = await service.listTasks('all')

    expect(open.map((task) => task.id)).toEqual(['t1'])
    expect(done.map((task) => task.id)).toEqual(['t2'])
    expect(all).toHaveLength(2)
  })

  it('rejects an unsupported status filter', async () => {
    const service = freshService()

    await expect(service.listTasks('archived')).rejects.toThrow(/Unsupported task status/)
  })

  it('clones tasks at the boundary so callers cannot mutate stored data', async () => {
    const service = freshService()

    const first = await service.listTasks()
    first[0].title = 'Mutated'
    first.push({ id: 'injected' })

    const second = await service.listTasks()
    expect(second).toHaveLength(2)
    expect(second[0].title).toBe('Write the plan')
  })
})

describe('taskService.createTask', () => {
  it('trims the title and defaults the new task to open', async () => {
    const service = freshService()

    const created = await service.createTask({ title: '  Ship the feature  ' })

    expect(created.title).toBe('Ship the feature')
    expect(created.description).toBe('')
    expect(created.status).toBe('open')
    expect(created.id).toBeTruthy()
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBe(created.createdAt)

    const tasks = await service.listTasks()
    expect(tasks).toHaveLength(3)
    expect(tasks[2]).toEqual(created)
  })

  it('keeps an optional description', async () => {
    const service = freshService()

    const created = await service.createTask({
      title: 'Add tests',
      description: '  cover the rollback path  ',
    })

    expect(created.description).toBe('cover the rollback path')
  })

  it('rejects a whitespace-only title', async () => {
    const service = freshService()

    await expect(service.createTask({ title: '   ' })).rejects.toThrow(/Title is required/)
    await expect(service.createTask({})).rejects.toThrow(/Title is required/)
    expect(await service.listTasks()).toHaveLength(2)
  })

  it('returns a clone that does not affect the stored task', async () => {
    const service = freshService()

    const created = await service.createTask({ title: 'Independent' })
    created.title = 'Changed by caller'

    const tasks = await service.listTasks()
    expect(tasks[2].title).toBe('Independent')
  })
})

describe('taskService.updateTask', () => {
  it('updates the title and description and refreshes updatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-26T10:00:00.000Z'))
    const service = freshService()
    const created = await service.createTask({ title: 'Original' })

    vi.setSystemTime(new Date('2026-09-26T10:05:00.000Z'))
    const updated = await service.updateTask(created.id, {
      title: '  Updated  ',
      description: 'Now with detail',
    })

    expect(updated.title).toBe('Updated')
    expect(updated.description).toBe('Now with detail')
    expect(updated.createdAt).toBe('2026-09-26T10:00:00.000Z')
    expect(updated.updatedAt).toBe('2026-09-26T10:05:00.000Z')
  })

  it('allows updating the status', async () => {
    const service = freshService()

    const updated = await service.updateTask('t1', { status: 'done' })

    expect(updated.status).toBe('done')
    expect((await service.listTasks('done')).map((task) => task.id)).toEqual(['t1', 't2'])
  })

  it('rejects an unknown id', async () => {
    const service = freshService()

    await expect(service.updateTask('missing', { title: 'Nope' })).rejects.toThrow(/Task not found/)
  })

  it('rejects an empty title on update', async () => {
    const service = freshService()

    await expect(service.updateTask('t1', { title: '  ' })).rejects.toThrow(/Title is required/)
    expect((await service.listTasks('open'))[0].title).toBe('Write the plan')
  })
})

describe('taskService.deleteTask', () => {
  it('removes the task by id and returns it', async () => {
    const service = freshService()

    const removed = await service.deleteTask('t1')

    expect(removed.id).toBe('t1')
    expect(removed.title).toBe('Write the plan')
    expect((await service.listTasks()).map((task) => task.id)).toEqual(['t2'])
  })

  it('rejects an unknown id', async () => {
    const service = freshService()

    await expect(service.deleteTask('missing')).rejects.toThrow(/Task not found/)
  })
})

describe('taskService failure hook', () => {
  it('rejects create when failureMode is create', async () => {
    const service = freshService({ failureMode: 'create' })

    await expect(service.createTask({ title: 'Nope' })).rejects.toThrow(/failed to create/)
  })

  it('rejects list when failureMode is list', async () => {
    const service = freshService({ failureMode: 'list' })

    await expect(service.listTasks()).rejects.toThrow(/failed to list/)
  })

  it('rejects update when failureMode is update', async () => {
    const service = freshService({ failureMode: 'update' })

    await expect(service.updateTask('t1', { title: 'Nope' })).rejects.toThrow(/failed to update/)
  })

  it('rejects only status updates when failureMode is toggle', async () => {
    const service = freshService({ failureMode: 'toggle' })

    await expect(service.updateTask('t1', { status: 'done' })).rejects.toThrow(/failed to update/)
    await expect(service.updateTask('t1', { title: 'Still allowed' })).resolves.toMatchObject({
      title: 'Still allowed',
    })
  })

  it('rejects delete when failureMode is delete', async () => {
    const service = freshService({ failureMode: 'delete' })

    await expect(service.deleteTask('t1')).rejects.toThrow(/failed to delete/)
  })

  it('accepts a custom failure predicate', async () => {
    const service = freshService({ failureMode: (operation) => operation === 'delete' })

    await expect(service.deleteTask('t1')).rejects.toThrow(/failed to delete/)
    await expect(service.listTasks()).resolves.toHaveLength(2)
  })
})
