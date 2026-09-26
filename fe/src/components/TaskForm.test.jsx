import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskForm from './TaskForm'

describe('TaskForm', () => {
  it('renders labelled title and description fields with a create action', () => {
    render(<TaskForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add task' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('submits a trimmed title and a trimmed description', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TaskForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Title'), '   Buy milk   ')
    await user.type(screen.getByLabelText('Description'), '  Semi skimmed  ')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Buy milk', description: 'Semi skimmed' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not call onSubmit for a whitespace-only title', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TaskForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Title'), '      ')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required.')
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders edit-mode values and the save/cancel actions', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const task = { id: 't1', title: 'Existing task', description: 'Existing description' }

    render(<TaskForm task={task} onSubmit={onSubmit} onCancel={onCancel} />)

    expect(screen.getByLabelText('Title')).toHaveValue('Existing task')
    expect(screen.getByLabelText('Description')).toHaveValue('Existing description')

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Existing task', description: 'Existing description' })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables the fields and action while busy', () => {
    render(<TaskForm task={{ id: 't1', title: 'Busy task', description: '' }} onSubmit={vi.fn()} busy />)

    expect(screen.getByLabelText('Title')).toBeDisabled()
    expect(screen.getByLabelText('Description')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
})
