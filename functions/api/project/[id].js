import { json } from '../../_utils/response.js'

/**
 * GET /api/project/:id
 */
export async function onRequestGet(context) {
  const { env, params } = context
  const id = params.id

  if (!env.DB) return json({ error: 'Database not configured' }, { status: 500 })

  const row = await env.DB.prepare('SELECT id, name, config, active FROM projects WHERE id = ?').bind(id).first()
  if (!row || !(row.active === 1 || row.active === true)) {
    return json({ error: 'Project not found' }, { status: 404 })
  }

  let config = {}
  try {
    config = JSON.parse(row.config)
  } catch {
    config = {}
  }

  // Public config excludes email recipient and any internal-only fields.
  return json(
    {
      id: row.id,
      name: row.name,
      requiredFiles: config.requiredFiles,
      maxFiles: config.maxFiles,
      allowedFileTypes: config.allowedFileTypes,
      metadataRequirements: config.metadataRequirements,
      instructions: config.instructions,
    },
    { status: 200 },
  )
}


