import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskFilters from './TaskFilters'

describe('TaskFilters', () => {
  it('renders All, Open, and Done filter buttons', () => {
    render(<TaskFilters value="all" onChange={vi.fn()} counts={{ all: 3, open: 2, done: 1 }} />)

    expect(screen.getByRole('group', { name: 'Filter tasks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('marks the active filter as pressed', () => {
    render(<TaskFilters value="open" onChange={vi.fn()} counts={{ all: 3, open: 2, done: 1 }} />)

    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the selected filter through onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TaskFilters value="all" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('done')
  })
})
