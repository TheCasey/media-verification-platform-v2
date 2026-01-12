export function validateProjectPayload(body) {
  const errors = []

  if (!body || typeof body !== 'object') errors.push('Body must be JSON object')
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) errors.push('name is required')
  if (!body?.config || typeof body.config !== 'object') errors.push('config is required')

  const config = body?.config
  if (config && typeof config === 'object') {
    if (config.mode !== undefined && config.mode !== 'audit' && config.mode !== 'self_check') {
      errors.push('config.mode must be audit|self_check if provided')
    }

    const requiredFiles = Number(config.requiredFiles)
    const maxFiles = Number(config.maxFiles)
    if (!Number.isInteger(requiredFiles) || requiredFiles < 1) errors.push('config.requiredFiles must be an integer >= 1')
    if (!Number.isInteger(maxFiles) || maxFiles < requiredFiles) errors.push('config.maxFiles must be an integer >= requiredFiles')

    if (!Array.isArray(config.allowedFileTypes) || config.allowedFileTypes.some((x) => typeof x !== 'string')) {
      errors.push('config.allowedFileTypes must be an array of strings')
    }

    if (typeof config.metadataRequirements !== 'object' || config.metadataRequirements === null) {
      errors.push('config.metadataRequirements must be an object')
    } else {
      for (const [key, rule] of Object.entries(config.metadataRequirements)) {
        if (typeof rule !== 'object' || rule === null) {
          errors.push(`config.metadataRequirements.${key} must be an object`)
          continue
        }
        if (typeof rule.required !== 'boolean') errors.push(`config.metadataRequirements.${key}.required must be boolean`)
        if (rule.failureMode && rule.failureMode !== 'hard' && rule.failureMode !== 'soft') {
          errors.push(`config.metadataRequirements.${key}.failureMode must be hard|soft`)
        }
      }
    }

    if (config.instructions && (typeof config.instructions !== 'object' || config.instructions === null)) {
      errors.push('config.instructions must be an object if provided')
    }

    if (config.emailRecipient && typeof config.emailRecipient !== 'string') {
      errors.push('config.emailRecipient must be a string if provided')
    }
  }

  const active = body?.active
  if (active !== undefined && typeof active !== 'boolean') errors.push('active must be boolean if provided')

  return errors
}

export function sanitizeProjectRow(row, { includeConfig = true, includeEmailRecipient = true } = {}) {
  const config = includeConfig ? safeJsonParse(row.config) : null
  if (config && !includeEmailRecipient) delete config.emailRecipient

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    active: row.active === 1 || row.active === true,
    config,
    submissionCount: row.submission_count ?? row.submissionCount ?? 0,
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}


