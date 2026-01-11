import { requireAdmin } from '../../../_utils/auth.js'
import { json } from '../../../_utils/response.js'

/**
 * GET /admin/project/:id/submissions?user_id=
 */
export async function onRequestGet(context) {
  const unauthorized = await requireAdmin(context)
  if (unauthorized) return unauthorized

  const { env, params, request } = context
  const projectId = params.id
  if (!env.DB) return json({ error: 'Database not configured' }, { status: 500 })

  const url = new URL(request.url)
  const userId = url.searchParams.get('user_id')

  const stmt = userId
    ? env.DB.prepare(
        'SELECT * FROM submissions WHERE project_id = ? AND user_id = ? ORDER BY submitted_at DESC',
      ).bind(projectId, userId)
    : env.DB.prepare('SELECT * FROM submissions WHERE project_id = ? ORDER BY submitted_at DESC').bind(projectId)

  const result = await stmt.all()
  if (!result.success) return json({ error: 'Failed to fetch submissions' }, { status: 500 })

  const submissions = result.results.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userId: row.user_id,
    submittedAt: row.submitted_at,
    data: (() => {
      try {
        return JSON.parse(row.data)
      } catch {
        return null
      }
    })(),
  }))

  return json(submissions, { status: 200 })
}


