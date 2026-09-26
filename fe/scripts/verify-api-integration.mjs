#!/usr/bin/env node
/**
 * Frontend -> backend integration check.
 *
 * Drives the real HTTP task service — the same module `src/services/index.js`
 * uses when `VITE_API_BASE_URL` is set — against a running backend, proving the
 * frontend contract and the Express API agree.
 *
 * Start the backend first:
 *   cd ../be && pnpm start
 *
 * Then run:
 *   pnpm verify:api
 *   # or: node scripts/verify-api-integration.mjs [baseUrl] [userId]
 */
import { createHttpTaskService } from '../src/services/httpTaskService.js'

const argv = globalThis.process?.argv ?? []
const env = globalThis.process?.env ?? {}
const baseUrl = argv[2] ?? env.TASK_API_URL ?? 'http://127.0.0.1:3003'
const userA = argv[3] ?? env.TASK_USER_ID ?? 'user-a'
const userB = `${userA}-neighbour`

const checks = []

function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition) })
  const mark = condition ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  const serviceA = createHttpTaskService({ baseUrl, userId: userA })
  const serviceB = createHttpTaskService({ baseUrl, userId: userB })
  const origin = String(baseUrl).replace(/\/+$/, '')

  const created = await serviceA.createTask({
    title: '  Integration check  ',
    description: 'created by verify-api-integration.mjs',
  })
  check('POST /tasks trims the title', created.title === 'Integration check', JSON.stringify(created.title))
  check('POST /tasks defaults status to open', created.status === 'open')
  check('POST /tasks returns id and timestamps', Boolean(created.id && created.createdAt && created.updatedAt))

  const listedA = await serviceA.listTasks()
  check('GET /tasks includes the new task for its owner', listedA.some((task) => task.id === created.id))

  const listedB = await serviceB.listTasks()
  check('GET /tasks hides the task from another user', !listedB.some((task) => task.id === created.id))

  const done = await serviceA.updateTask(created.id, { status: 'done' })
  check('PUT /tasks/:id toggles to done', done.status === 'done')
  check('PUT /tasks/:id keeps createdAt and bumps updatedAt', done.createdAt === created.createdAt && done.updatedAt >= created.updatedAt)

  const doneList = await serviceA.listTasks('done')
  check('GET /tasks?status=done returns the done task', doneList.some((task) => task.id === created.id))

  const openList = await serviceA.listTasks('open')
  check('GET /tasks?status=open excludes the done task', !openList.some((task) => task.id === created.id))

  const reopened = await serviceA.updateTask(created.id, { status: 'open', title: 'Integration check (edited)' })
  check('PUT /tasks/:id reopens and renames', reopened.status === 'open' && reopened.title === 'Integration check (edited)')

  let crossOwnerError = ''
  try {
    await serviceB.updateTask(created.id, { title: 'hijacked' })
  } catch (error) {
    crossOwnerError = error.message
  }
  check('Cross-owner PUT is rejected with 404', crossOwnerError.includes('404'), crossOwnerError)

  const unauthenticated = await fetch(`${origin}/tasks`)
  check('GET /tasks without X-User-Id returns 401', unauthenticated.status === 401, `status ${unauthenticated.status}`)

  await serviceA.deleteTask(created.id)
  const afterDelete = await serviceA.listTasks()
  check('DELETE /tasks/:id removes the task', !afterDelete.some((task) => task.id === created.id))

  const failed = checks.filter((entry) => !entry.ok)
  console.log(`\n${checks.length - failed.length}/${checks.length} integration checks passed.`)
  if (failed.length > 0) {
    globalThis.process?.exit?.(1)
  }
}

main().catch((error) => {
  console.error(`Integration check failed: ${error.message}`)
  globalThis.process?.exit?.(1)
})
