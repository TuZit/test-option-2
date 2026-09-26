import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TaskList from './TaskList'

const tasks = [
  {
    id: 't1',
    title: 'First task',
    description: '',
    status: 'open',
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:00:00.000Z',
  },
  {
    id: 't2',
    title: 'Second task',
    description: '',
    status: 'done',
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:00:00.000Z',
  },
]

describe('TaskList', () => {
  it('renders one item per task and marks pending ids', () => {
    render(<TaskList tasks={tasks} pendingIds={new Set(['t2'])} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Delete First task' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Delete Second task' })).toBeDisabled()
  })

  it('renders the supplied empty state when there are no tasks', () => {
    render(<TaskList tasks={[]} emptyState={<p>Nothing matches this filter.</p>} />)

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing matches this filter.')).toBeInTheDocument()
  })
})
