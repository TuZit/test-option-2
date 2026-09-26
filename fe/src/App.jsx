import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import TaskFilters from './components/TaskFilters'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { taskService } from './services/index.js'

const FILTER_EMPTY_LABELS = { open: 'open', done: 'done' }

function errorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message
  }
  return fallback
}

/**
 * Page coordinator: owns the task collection, filter, pending operations,
 * feedback, and the optimistic transitions around every service write.
 *
 * @param {object} props
 * @param {ReturnType<import('./services/taskService').createTaskService>} [props.service]
 */
function App({ service = taskService }) {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [formBusy, setFormBusy] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [pendingIds, setPendingIds] = useState(() => new Set())

  const [reloadToken, setReloadToken] = useState(false)

  // Load (and reload) the task collection. All state updates happen after the
  // service promise settles, so the effect itself never triggers a cascade.
  useEffect(() => {
    let active = true

    async function load() {
      try {
        const loaded = await service.listTasks()
        if (!active) return
        setTasks(Array.isArray(loaded) ? loaded : [])
        setLoadError(null)
      } catch (error) {
        if (!active) return
        setTasks([])
        setLoadError(errorMessage(error, 'Unexpected error while loading tasks.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [service, reloadToken])

  const retryLoad = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setReloadToken((token) => !token)
  }, [])

  const visibleTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)),
    [tasks, filter],
  )

  const counts = useMemo(
    () => ({
      all: tasks.length,
      open: tasks.filter((task) => task.status === 'open').length,
      done: tasks.filter((task) => task.status === 'done').length,
    }),
    [tasks],
  )

  const markPending = useCallback((id, pending) => {
    setPendingIds((previous) => {
      const next = new Set(previous)
      if (pending) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleCreate = useCallback(
    async (values) => {
      const title = String(values?.title ?? '').trim()
      if (!title) {
        // Defensive: the form already blocks this, so the service is never called.
        setFeedback({ type: 'error', message: 'Title is required.' })
        return
      }

      setFormBusy(true)
      setFeedback(null)
      try {
        const created = await service.createTask({ title, description: values?.description ?? '' })
        setTasks((previous) => [...previous, created])
        setFormKey((key) => key + 1)
        setFeedback({ type: 'success', message: `Added "${created.title}".` })
      } catch (error) {
        setFeedback({ type: 'error', message: `Could not add the task. ${errorMessage(error, '')}`.trim() })
      } finally {
        setFormBusy(false)
      }
    },
    [service],
  )

  const handleUpdate = useCallback(
    async (id, values) => {
      const title = String(values?.title ?? '').trim()
      if (!title) {
        setFeedback({ type: 'error', message: 'Title is required.' })
        return
      }

      const snapshot = tasks
      const optimisticUpdatedAt = new Date().toISOString()

      setFeedback(null)
      setEditingTask(null)
      setTasks((previous) =>
        previous.map((task) =>
          task.id === id
            ? { ...task, title, description: values?.description ?? '', updatedAt: optimisticUpdatedAt }
            : task,
        ),
      )
      markPending(id, true)

      try {
        const updated = await service.updateTask(id, { title, description: values?.description ?? '' })
        setTasks((previous) => previous.map((task) => (task.id === id ? updated : task)))
        setFeedback({ type: 'success', message: `Updated "${updated.title}".` })
      } catch (error) {
        setTasks(snapshot)
        setFeedback({
          type: 'error',
          message: `Could not update the task, your change was rolled back. ${errorMessage(error, '')}`.trim(),
        })
      } finally {
        markPending(id, false)
      }
    },
    [markPending, service, tasks],
  )

  const handleToggle = useCallback(
    async (task) => {
      const nextStatus = task.status === 'open' ? 'done' : 'open'
      const snapshot = tasks
      const optimisticUpdatedAt = new Date().toISOString()

      setFeedback(null)
      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id ? { ...item, status: nextStatus, updatedAt: optimisticUpdatedAt } : item,
        ),
      )
      markPending(task.id, true)

      try {
        const updated = await service.updateTask(task.id, { status: nextStatus })
        setTasks((previous) => previous.map((item) => (item.id === task.id ? updated : item)))
        setFeedback({
          type: 'success',
          message: nextStatus === 'done' ? `Marked "${updated.title}" as done.` : `Reopened "${updated.title}".`,
        })
      } catch (error) {
        setTasks(snapshot)
        setFeedback({
          type: 'error',
          message: `Could not change the status of "${task.title}", it was rolled back. ${errorMessage(error, '')}`.trim(),
        })
      } finally {
        markPending(task.id, false)
      }
    },
    [markPending, service, tasks],
  )

  const handleDelete = useCallback(
    async (task) => {
      const snapshot = tasks

      setFeedback(null)
      setEditingTask((current) => (current && current.id === task.id ? null : current))
      setTasks((previous) => previous.filter((item) => item.id !== task.id))
      markPending(task.id, true)

      try {
        await service.deleteTask(task.id)
        setFeedback({ type: 'success', message: `Deleted "${task.title}".` })
      } catch (error) {
        setTasks(snapshot)
        setFeedback({
          type: 'error',
          message: `Could not delete "${task.title}", the task was restored. ${errorMessage(error, '')}`.trim(),
        })
      } finally {
        markPending(task.id, false)
      }
    },
    [markPending, service, tasks],
  )

  const emptyState =
    tasks.length === 0 ? (
      <div className="app__empty">
        <h2 className="app__empty-title">No tasks yet</h2>
        <p className="app__empty-text">Add your first task with the form above to get started.</p>
      </div>
    ) : (
      <div className="app__empty">
        <h2 className="app__empty-title">No {FILTER_EMPTY_LABELS[filter] ?? filter} tasks</h2>
        <p className="app__empty-text">
          Nothing matches this filter right now. Your other tasks are still here — try another filter.
        </p>
      </div>
    )

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Task Manager</h1>
        <p className="app__subtitle">Create, track, and complete your tasks.</p>
      </header>

      <main className="app__main">
        <Card className="app__composer">
          <CardHeader>
            <CardTitle>Add a task</CardTitle>
            <CardDescription>A title is required; a description is optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskForm key={formKey} onSubmit={handleCreate} busy={formBusy} />
          </CardContent>
        </Card>

        <section className="app__board" aria-label="Task board">
          <div className="app__board-header">
            <TaskFilters value={filter} onChange={setFilter} counts={counts} />
            {!loading && !loadError ? (
              <p className="app__summary">
                Showing {visibleTasks.length} of {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </p>
            ) : null}
          </div>

          {feedback ? (
            <Alert
              className="app__feedback"
              variant={feedback.type === 'error' ? 'destructive' : 'success'}
            >
              {feedback.message}
            </Alert>
          ) : null}

          {loading ? (
            <div className="app__state" role="status">
              <span className="app__spinner" aria-hidden="true" />
              Loading tasks…
            </div>
          ) : loadError ? (
            <Alert className="app__state" variant="destructive">
              <AlertTitle>Could not load your tasks</AlertTitle>
              <AlertDescription>
                <p className="app__error-text">{loadError}</p>
                <Button variant="outline" size="sm" onClick={retryLoad}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <TaskList
              tasks={visibleTasks}
              pendingIds={pendingIds}
              editingTaskId={editingTask?.id ?? null}
              onToggle={handleToggle}
              onStartEdit={setEditingTask}
              onCancelEdit={() => setEditingTask(null)}
              onSubmitEdit={handleUpdate}
              onDelete={handleDelete}
              emptyState={emptyState}
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default App
