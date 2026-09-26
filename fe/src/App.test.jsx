import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { createTaskService } from './services/taskService'

function seedTasks() {
  return [
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
}

function makeService(options = {}) {
  return createTaskService({ seedTasks: seedTasks(), ...options })
}

function taskRow(title) {
  return screen.getByRole('heading', { name: title }).closest('li')
}

describe('App', () => {
  it('renders tasks and the empty state', async () => {
    const { rerender } = render(<App service={makeService()} />)

    expect(await screen.findByRole('heading', { name: 'Write the plan' })).toBeInTheDocument()
    expect(screen.getByText('Draft the implementation plan.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review the design' })).toBeInTheDocument()
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()

    rerender(<App service={createTaskService({ seedTasks: [] })} />)

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Write the plan' })).not.toBeInTheDocument()
  })

  it('creates a task and shows success feedback', async () => {
    const user = userEvent.setup()
    render(<App service={makeService()} />)
    await screen.findByRole('heading', { name: 'Write the plan' })

    await user.type(screen.getByLabelText('Title'), 'New assessment task')
    await user.type(screen.getByLabelText('Description'), 'With a description')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Added "New assessment task".')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New assessment task' })).toBeInTheDocument()
    expect(screen.getByText('With a description')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('rejects a whitespace-only title without calling the service', async () => {
    const user = userEvent.setup()
    const base = makeService()
    const createTask = vi.fn(base.createTask)
    const service = { ...base, createTask }

    render(<App service={service} />)
    await screen.findByRole('heading', { name: 'Write the plan' })

    await user.type(screen.getByLabelText('Title'), '     ')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required.')
    expect(createTask).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: '     ' })).not.toBeInTheDocument()
  })

  it('edits a task', async () => {
    const user = userEvent.setup()
    render(<App service={makeService()} />)
    const row = await waitFor(() => taskRow('Write the plan'))
    const form = within(row)

    await user.click(screen.getByRole('button', { name: 'Edit Write the plan' }))
    await user.clear(form.getByLabelText('Title'))
    await user.type(form.getByLabelText('Title'), 'Write the final plan')
    await user.click(form.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Updated "Write the final plan".')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Write the final plan' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Write the plan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('toggles a task open, done, and open again', async () => {
    const user = userEvent.setup()
    render(<App service={makeService()} />)
    const row = await waitFor(() => taskRow('Write the plan'))

    expect(row).toHaveAttribute('data-status', 'open')

    await user.click(screen.getByRole('button', { name: 'Mark Write the plan as done' }))
    await waitFor(() => expect(row).toHaveAttribute('data-status', 'done'))
    expect(within(row).getByText('Done')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark Write the plan as open' }))
    await waitFor(() => expect(row).toHaveAttribute('data-status', 'open'))
    expect(within(row).getByText('Open')).toBeInTheDocument()
  })

  it('disables the toggle while a write is pending', async () => {
    const user = userEvent.setup()
    const base = makeService()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const updateTask = vi.fn(async (id, patch) => {
      await gate
      return base.updateTask(id, patch)
    })
    const service = { ...base, updateTask }

    render(<App service={service} />)
    await screen.findByRole('heading', { name: 'Write the plan' })

    await user.click(screen.getByRole('button', { name: 'Mark Write the plan as done' }))

    const pendingToggle = await screen.findByRole('button', { name: 'Mark Write the plan as open' })
    expect(pendingToggle).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Write the plan' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Write the plan' })).toBeDisabled()

    // A rapid second click must not create a duplicate write.
    await user.click(pendingToggle)
    expect(updateTask).toHaveBeenCalledTimes(1)

    release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Write the plan as open' })).toBeEnabled())
    expect(updateTask).toHaveBeenCalledTimes(1)
  })

  it('deletes a task', async () => {
    const user = userEvent.setup()
    render(<App service={makeService()} />)
    await screen.findByRole('heading', { name: 'Review the design' })

    await user.click(screen.getByRole('button', { name: 'Delete Review the design' }))

    expect(await screen.findByText('Deleted "Review the design".')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Review the design' })).not.toBeInTheDocument()
  })

  it('filters all, open, and done tasks', async () => {
    const user = userEvent.setup()
    render(<App service={makeService()} />)
    await screen.findByRole('heading', { name: 'Write the plan' })

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('heading', { name: 'Write the plan' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Review the design' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('heading', { name: 'Review the design' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Write the plan' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByRole('heading', { name: 'Write the plan' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review the design' })).toBeInTheDocument()
  })

  it('shows a filtered empty state that does not imply the tasks were deleted', async () => {
    const user = userEvent.setup()
    const openOnly = seedTasks().filter((task) => task.status === 'open')
    render(<App service={createTaskService({ seedTasks: openOnly })} />)
    await screen.findByRole('heading', { name: 'Write the plan' })

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('No done tasks')).toBeInTheDocument()
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('heading', { name: 'Write the plan' })).toBeInTheDocument()
  })

  it('rolls back a failed optimistic update and shows an error', async () => {
    const user = userEvent.setup()
    const base = makeService()
    const service = {
      ...base,
      updateTask: vi.fn(async () => {
        throw new Error('network down')
      }),
    }

    render(<App service={service} />)
    const row = await waitFor(() => taskRow('Write the plan'))

    await user.click(screen.getByRole('button', { name: 'Edit Write the plan' }))
    await user.clear(within(row).getByLabelText('Title'))
    await user.type(within(row).getByLabelText('Title'), 'Doomed change')
    await user.click(within(row).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/rolled back/i)).toBeInTheDocument()
    expect(screen.getByText(/network down/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Write the plan' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Doomed change' })).not.toBeInTheDocument()
  })

  it('rolls back a failed toggle to the previous status', async () => {
    const user = userEvent.setup()
    render(<App service={makeService({ failureMode: 'toggle' })} />)
    const row = await waitFor(() => taskRow('Write the plan'))

    await user.click(screen.getByRole('button', { name: 'Mark Write the plan as done' }))

    expect(await screen.findByText(/rolled back/i)).toBeInTheDocument()
    await waitFor(() => expect(row).toHaveAttribute('data-status', 'open'))
    expect(screen.getByRole('button', { name: 'Mark Write the plan as done' })).toBeEnabled()
  })

  it('rolls back a failed delete and restores the task', async () => {
    const user = userEvent.setup()
    render(<App service={makeService({ failureMode: 'delete' })} />)
    await screen.findByRole('heading', { name: 'Review the design' })

    await user.click(screen.getByRole('button', { name: 'Delete Review the design' }))

    expect(await screen.findByText(/the task was restored/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review the design' })).toBeInTheDocument()
  })

  it('shows an initial-load error with retry feedback', async () => {
    const user = userEvent.setup()
    const base = makeService()
    let attempts = 0
    const listTasks = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('service offline')
      return base.listTasks()
    })

    render(<App service={{ ...base, listTasks }} />)

    expect(await screen.findByText('Could not load your tasks')).toBeInTheDocument()
    expect(screen.getByText('service offline')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Write the plan' })).toBeInTheDocument()
    expect(screen.queryByText('Could not load your tasks')).not.toBeInTheDocument()
    expect(listTasks).toHaveBeenCalledTimes(2)
  })
})
