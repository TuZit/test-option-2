import { formatTimestamp } from '../lib/format'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import TaskForm from './TaskForm'

/**
 * A single task row. Mutating controls are disabled while `pending` is true,
 * which prevents duplicate rapid requests for this task.
 */
function TaskItem({
  task,
  pending = false,
  editing = false,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
}) {
  if (editing) {
    return (
      <li className="task-item task-item--editing" data-status={task.status}>
        <TaskForm
          task={task}
          busy={pending}
          onSubmit={(values) => onSubmitEdit?.(task.id, values)}
          onCancel={onCancelEdit}
        />
      </li>
    )
  }

  const isDone = task.status === 'done'
  const created = formatTimestamp(task.createdAt)
  const updated = formatTimestamp(task.updatedAt)

  return (
    <li className="task-item" data-status={task.status} data-pending={pending ? 'true' : 'false'}>
      <div className="task-item__main">
        <div className="task-item__heading">
          <h3 className="task-item__title">{task.title}</h3>
          <Badge variant={isDone ? 'success' : 'secondary'} className="task-item__status">
            {isDone ? 'Done' : 'Open'}
          </Badge>
        </div>

        {task.description ? <p className="task-item__description">{task.description}</p> : null}

        <p className="task-item__meta">
          {created ? <span className="task-item__timestamp">Created {created}</span> : null}
          {updated ? <span className="task-item__timestamp">Updated {updated}</span> : null}
        </p>
      </div>

      <div className="task-item__actions">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          aria-label={isDone ? `Mark ${task.title} as open` : `Mark ${task.title} as done`}
          onClick={() => onToggle?.(task)}
        >
          {isDone ? 'Reopen' : 'Complete'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Edit ${task.title}`}
          onClick={() => onStartEdit?.(task)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete?.(task)}
        >
          Delete
        </Button>
      </div>
    </li>
  )
}

export default TaskItem
