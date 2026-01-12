import { json } from '../_utils/response.js'
import { rejectIfTooLarge } from '../_utils/request.js'

/**
 * POST /verify/:projectId
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false
  const e = email.trim()
  // intentionally simple; backend does not send mail directly unless configured
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function normalizeString(s) {
  return typeof s === 'string' ? s.trim() : ''
}

export async function onRequestPost(context) {
  const { request, env, params } = context
  const projectId = params.projectId

  if (!env.DB) return json({ error: 'Database not configured' }, { status: 500 })

  // Overall payload cap (safety): prevents unexpectedly large metadata payloads.
  const tooLarge = rejectIfTooLarge(request, { maxBytes: 256 * 1024 })
  if (tooLarge) return tooLarge

  const projectRow = await env.DB.prepare('SELECT id, name, config, active FROM projects WHERE id = ?')
    .bind(projectId)
    .first()

  if (!projectRow || !(projectRow.active === 1 || projectRow.active === true)) {
    return json({ error: 'Project not found' }, { status: 404 })
  }

  let config = {}
  try {
    config = JSON.parse(projectRow.config)
  } catch {
    config = {}
  }

  if ((config.mode || 'audit') === 'self_check') {
    return json(
      { error: 'This project is self-check only; submissions are not stored.' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON body' }, { status: 400 })

  const userName = normalizeString(body.userName)
  const userEmail = normalizeString(body.userEmail)
  const userId = normalizeString(body.userId)
  const files = body.files

  if (!userName || !userEmail || !userId) {
    return json({ error: 'Name, email, and user ID are required' }, { status: 400 })
  }
  if (!isValidEmail(userEmail)) {
    return json({ error: 'Invalid email format' }, { status: 400 })
  }
  if (!/^[0-9]+$/.test(userId)) {
    return json({ error: 'User ID must contain only numbers' }, { status: 400 })
  }
  if (!Array.isArray(files) || files.length === 0) {
    return json({ error: 'At least one file is required' }, { status: 400 })
  }

  const requiredFiles = Number(config.requiredFiles || 0)
  const maxFiles = Number(config.maxFiles || 0)
  const allowed = Array.isArray(config.allowedFileTypes) ? config.allowedFileTypes : []

  if (Number.isFinite(requiredFiles) && requiredFiles > 0 && files.length < requiredFiles) {
    return json({ error: `At least ${requiredFiles} files are required` }, { status: 400 })
  }
  if (Number.isFinite(maxFiles) && maxFiles > 0 && files.length > maxFiles) {
    return json({ error: `Maximum ${maxFiles} files allowed` }, { status: 400 })
  }

  // Per-file metadata cap (safety). This is in addition to the overall payload cap above.
  // If you later store a richer EXIF/debug payload, keep this limit bounded to avoid D1 bloat.
  const MAX_METADATA_BYTES_PER_FILE = 64 * 1024

  for (const f of files) {
    if (!f || typeof f !== 'object') return json({ error: 'Invalid file entry' }, { status: 400 })
    if (typeof f.filename !== 'string' || !f.filename) return json({ error: 'File filename is required' }, { status: 400 })
    if (typeof f.type !== 'string' || !f.type) return json({ error: 'File type is required' }, { status: 400 })
    if (allowed.length && !allowed.includes(f.type)) {
      return json({ error: `File type not allowed: ${f.type}` }, { status: 400 })
    }
    if (typeof f.size !== 'number' || !Number.isFinite(f.size) || f.size < 0) {
      return json({ error: 'File size must be a non-negative number' }, { status: 400 })
    }
    if (typeof f.metadata !== 'object' || f.metadata === null) {
      return json({ error: 'File metadata must be an object' }, { status: 400 })
    }
    if (typeof f.validation !== 'object' || f.validation === null) {
      return json({ error: 'File validation must be an object' }, { status: 400 })
    }

    // Best-effort size check (UTF-8 size approx via TextEncoder).
    // If this trips, reduce captured EXIF/debug fields (e.g., strip MakerNotes/thumbnails/large blobs).
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(f.metadata)).byteLength
      if (bytes > MAX_METADATA_BYTES_PER_FILE) {
        return json(
          {
            error: `File metadata too large (${bytes} bytes). Reduce captured EXIF/debug fields and try again.`,
          },
          { status: 413 },
        )
      }
    } catch {
      return json({ error: 'File metadata is not serializable JSON' }, { status: 400 })
    }
  }

  const submission = {
    projectId,
    projectName: projectRow.name,
    userName,
    userEmail,
    userId,
    submittedAt: new Date().toISOString(),
    files,
  }

  const result = await env.DB.prepare(
    'INSERT INTO submissions (project_id, user_name, user_email, user_id, data) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(projectId, userName, userEmail, userId, JSON.stringify(submission))
    .run()

  if (!result.success) {
    return json({ error: 'Failed to store submission' }, { status: 500 })
  }

  const submissionId = result.meta?.last_row_id ?? null

  // Optional email notification (metadata-only).
  let emailSent = false
  const recipient = typeof config.emailRecipient === 'string' ? config.emailRecipient.trim() : ''
  const apiKey = env.RESEND_API_KEY
  const from = env.RESEND_FROM || 'Media Verification <noreply@example.com>'
  if (recipient && apiKey) {
    try {
      const html = `
        <h2>Media Verification Submission</h2>
        <p><strong>Project:</strong> ${escapeHtml(projectRow.name)}</p>
        <p><strong>Name:</strong> ${escapeHtml(userName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
        <p><strong>User ID:</strong> ${escapeHtml(userId)}</p>
        <p><strong>Submitted At:</strong> ${escapeHtml(submission.submittedAt)}</p>
        <p><strong>Files:</strong> ${files.length}</p>
        <pre style="white-space: pre-wrap; font-size: 12px;">${escapeHtml(JSON.stringify(submission, null, 2))}</pre>
      `

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: recipient,
          subject: `Media Verification - ${projectRow.name} - ${userName}`,
          html,
        }),
      })

      if (resp.ok) {
        emailSent = true
      } else {
        // store submission even if email fails
        console.error('Resend email failed:', await resp.text())
      }
    } catch (e) {
      console.error('Resend email error:', e)
    }
  }

  return json({ success: true, submissionId, emailSent }, { status: 200 })
}

function escapeHtml(text) {
  if (!text) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return String(text).replace(/[&<>"']/g, (m) => map[m])
}


