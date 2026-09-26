import { useId, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

/**
 * Create/edit form for a task. Owns only input state and inline validation;
 * all persistence is delegated through `onSubmit`.
 *
 * @param {object} props
 * @param {object|null} [props.task] Existing task when editing, otherwise null.
 * @param {(values: { title: string, description: string }) => void} props.onSubmit
 * @param {() => void} [props.onCancel] Required in edit mode.
 * @param {boolean} [props.busy]
 */
function TaskForm({ task = null, onSubmit, onCancel, busy = false }) {
  const isEditing = Boolean(task)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [error, setError] = useState('')

  const fieldId = useId()
  const titleId = `${fieldId}-title`
  const descriptionId = `${fieldId}-description`
  const errorId = `${fieldId}-error`

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedTitle = title.trim()

    // Whitespace-only titles never reach the service layer.
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }

    setError('')
    onSubmit?.({ title: trimmedTitle, description: description.trim() })
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate aria-busy={busy}>
      <div className="task-form__field">
        <label className="task-form__label" htmlFor={titleId}>
          Title
        </label>
        <Input
          id={titleId}
          name="title"
          value={title}
          placeholder="What needs to be done?"
          autoComplete="off"
          required
          disabled={busy}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="task-form__field">
        <label className="task-form__label" htmlFor={descriptionId}>
          Description
        </label>
        <Textarea
          id={descriptionId}
          name="description"
          value={description}
          placeholder="Optional details"
          disabled={busy}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      {error ? (
        <p id={errorId} className="task-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="task-form__actions">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Add task'}
        </Button>
        {isEditing && onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}

export default TaskForm
