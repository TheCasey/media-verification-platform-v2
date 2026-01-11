import { requireAdmin } from '../_utils/auth.js'
import { json } from '../_utils/response.js'
import { sanitizeProjectRow, validateProjectPayload } from '../_utils/validate.js'

/**
 * GET /admin/projects
 * POST /admin/projects
 */
export async function onRequestGet(context) {
  const unauthorized = await requireAdmin(context)
  if (unauthorized) return unauthorized

  const { env } = context
  if (!env.DB) return json({ error: 'Database not configured' }, { status: 500 })

  const result = await env.DB.prepare(
    `SELECT p.*, COUNT(s.id) AS submission_count
     FROM projects p
     LEFT JOIN submissions s ON s.project_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
  ).all()

  if (!result.success) return json({ error: 'Failed to fetch projects' }, { status: 500 })
  const projects = result.results.map((row) => sanitizeProjectRow(row))
  return json(projects, { status: 200 })
}

export async function onRequestPost(context) {
  const unauthorized = await requireAdmin(context)
  if (unauthorized) return unauthorized

  const { request, env } = context
  if (!env.DB) return json({ error: 'Database not configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const errors = validateProjectPayload(body)
  if (errors.length) return json({ error: 'Invalid project payload', details: errors }, { status: 400 })

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await env.DB.prepare(
    'INSERT INTO projects (id, name, created_at, updated_at, config, active) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      body.name.trim(),
      now,
      now,
      JSON.stringify({ ...body.config, name: body.name.trim() }),
      body.active === false ? 0 : 1,
    )
    .run()

  const created = {
    id,
    name: body.name.trim(),
    created_at: now,
    updated_at: now,
    config: JSON.stringify({ ...body.config, name: body.name.trim() }),
    active: body.active === false ? 0 : 1,
    submission_count: 0,
  }
  return json(sanitizeProjectRow(created), { status: 201 })
}


