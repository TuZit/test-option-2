import TaskItem from './TaskItem'

/**
 * Renders the visible task rows, or the caller-supplied empty state.
 */
function TaskList({
  tasks = [],
  pendingIds,
  editingTaskId = null,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  emptyState = null,
}) {
  if (tasks.length === 0) {
    return (
      <div className="task-list__empty" data-testid="task-list-empty">
        {emptyState ?? <p>No tasks yet.</p>}
      </div>
    )
  }

  return (
    <ul className="task-list" aria-label="Tasks">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          pending={pendingIds?.has(task.id) ?? false}
          editing={editingTaskId === task.id}
          onToggle={onToggle}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSubmitEdit={onSubmitEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

export default TaskList
