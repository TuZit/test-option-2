import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskItem from './TaskItem'

const openTask = {
  id: 't1',
  title: 'Write the tests',
  description: 'Cover the rollback path.',
  status: 'open',
  createdAt: '2026-09-25T08:00:00.000Z',
  updatedAt: '2026-09-25T09:30:00.000Z',
}

const doneTask = { ...openTask, id: 't2', title: 'Ship it', status: 'done', description: '' }

describe('TaskItem', () => {
  it('renders the title, description, status, and timestamps', () => {
    render(<TaskItem task={openTask} />)

    const item = screen.getByRole('listitem')
    expect(within(item).getByRole('heading', { name: 'Write the tests' })).toBeInTheDocument()
    expect(within(item).getByText('Cover the rollback path.')).toBeInTheDocument()
    expect(within(item).getByText('Open')).toBeInTheDocument()
    expect(within(item).getByText(/Created/)).toBeInTheDocument()
    expect(within(item).getByText(/Updated/)).toBeInTheDocument()
    expect(item).toHaveAttribute('data-status', 'open')
  })

  it('shows a Done status for completed tasks and omits an empty description', () => {
    render(<TaskItem task={doneTask} />)

    const item = screen.getByRole('listitem')
    expect(within(item).getByText('Done')).toBeInTheDocument()
    expect(item).toHaveAttribute('data-status', 'done')
    expect(within(item).queryByText('Cover the rollback path.')).not.toBeInTheDocument()
  })

  it('exposes action labels that reflect the next action', () => {
    const { unmount } = render(<TaskItem task={openTask} />)
    expect(screen.getByRole('button', { name: 'Mark Write the tests as done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Write the tests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Write the tests' })).toBeInTheDocument()
    unmount()

    render(<TaskItem task={doneTask} />)
    expect(screen.getByRole('button', { name: 'Mark Ship it as open' })).toBeInTheDocument()
  })

  it('invokes toggle, edit, and delete handlers', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const onStartEdit = vi.fn()
    const onDelete = vi.fn()

    render(<TaskItem task={openTask} onToggle={onToggle} onStartEdit={onStartEdit} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Mark Write the tests as done' }))
    await user.click(screen.getByRole('button', { name: 'Edit Write the tests' }))
    await user.click(screen.getByRole('button', { name: 'Delete Write the tests' }))

    expect(onToggle).toHaveBeenCalledWith(openTask)
    expect(onStartEdit).toHaveBeenCalledWith(openTask)
    expect(onDelete).toHaveBeenCalledWith(openTask)
  })

  it('disables every mutating control while pending', () => {
    render(<TaskItem task={openTask} pending />)

    expect(screen.getByRole('button', { name: 'Mark Write the tests as done' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Write the tests' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Write the tests' })).toBeDisabled()
    expect(screen.getByRole('listitem')).toHaveAttribute('data-pending', 'true')
  })

  it('renders an edit form pre-filled with the task values', () => {
    render(<TaskItem task={openTask} editing onSubmitEdit={vi.fn()} onCancelEdit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toHaveValue('Write the tests')
    expect(screen.getByLabelText('Description')).toHaveValue('Cover the rollback path.')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })
})
