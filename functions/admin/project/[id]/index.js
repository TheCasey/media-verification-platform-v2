import { requireAdmin } from '../../../_utils/auth.js'
import { json } from '../../../_utils/response.js'
import { sanitizeProjectRow, validateProjectPayload } from '../../../_utils/validate.js'

/**
 * GET /admin/project/:id
 * PUT /admin/project/:id
 * DELETE /admin/project/:id
 */
export async function onRequest(context) {
  const unauthorized = await requireAdmin(context)
  if (unauthorized) return unauthorized

  const { request, env, params } = context
  const id = params.id
  if (!env.DB) return json({ error: 'Database not configured' }, { status: 500 })

  const method = request.method.toUpperCase()

  if (method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT p.*, COUNT(s.id) AS submission_count
       FROM projects p
       LEFT JOIN submissions s ON s.project_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
    )
      .bind(id)
      .first()
    if (!row) return json({ error: 'Project not found' }, { status: 404 })
    return json(sanitizeProjectRow(row), { status: 200 })
  }

  if (method === 'PUT') {
    const body = await request.json().catch(() => null)
    // For updates, allow partial payloads.
    const patchErrors = []
    if (body?.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) patchErrors.push('name must be non-empty string')
    if (body?.config !== undefined && (typeof body.config !== 'object' || body.config === null)) patchErrors.push('config must be object')
    if (body?.active !== undefined && typeof body.active !== 'boolean') patchErrors.push('active must be boolean')
    if (patchErrors.length) return json({ error: 'Invalid update payload', details: patchErrors }, { status: 400 })

    const existing = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
    if (!existing) return json({ error: 'Project not found' }, { status: 404 })

    const nextName = body?.name !== undefined ? body.name.trim() : existing.name
    let existingConfig = {}
    try {
      existingConfig = JSON.parse(existing.config || '{}')
    } catch {
      existingConfig = {}
    }
    const nextConfig = body?.config !== undefined ? { ...body.config, name: nextName } : { ...existingConfig, name: nextName }
    const nextActive = body?.active !== undefined ? (body.active ? 1 : 0) : existing.active
    const now = new Date().toISOString()

    // Validate final config + name using the same rules as project creation.
    const fullErrors = validateProjectPayload({ name: nextName, config: nextConfig, active: nextActive === 1 })
    if (fullErrors.length) return json({ error: 'Invalid project config', details: fullErrors }, { status: 400 })

    await env.DB.prepare('UPDATE projects SET name = ?, config = ?, active = ?, updated_at = ? WHERE id = ?')
      .bind(nextName, JSON.stringify(nextConfig), nextActive, now, id)
      .run()

    const updated = await env.DB.prepare(
      `SELECT p.*, COUNT(s.id) AS submission_count
       FROM projects p
       LEFT JOIN submissions s ON s.project_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
    )
      .bind(id)
      .first()
    return json(sanitizeProjectRow(updated), { status: 200 })
  }

  if (method === 'DELETE') {
    // Policy choice: treat DELETE as “deactivate project” to retain submissions + audit trail.
    const now = new Date().toISOString()
    const res = await env.DB.prepare('UPDATE projects SET active = 0, updated_at = ? WHERE id = ?').bind(now, id).run()
    if (!res.success) return json({ error: 'Failed to deactivate project' }, { status: 500 })
    return json({ success: true }, { status: 200 })
  }

  return json({ error: 'Method not allowed' }, { status: 405 })
}


