import { issueAdminSessionCookie } from '../_utils/auth.js'
import { json } from '../_utils/response.js'

/**
 * POST /admin/login
 * Sets session cookie.
 */
function normalizeHash(str) {
  if (!str) return null
  const s = String(str).trim()
  return s.startsWith('sha256:') ? s.slice('sha256:'.length) : s
}

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(digest))
}

function constantTimeEqual(a, b) {
  const aa = new TextEncoder().encode(String(a))
  const bb = new TextEncoder().encode(String(b))
  if (aa.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i]
  return diff === 0
}

export async function onRequestPost(context) {
  const { request, env } = context
  const body = await request.json().catch(() => null)
  const password = body?.password

  if (!password) {
    return json({ error: 'Password is required' }, { status: 400 })
  }

  const configuredPlain = env.ADMIN_PASSWORD
  const configuredHash = normalizeHash(env.ADMIN_PASSWORD_HASH)

  if (!configuredPlain && !configuredHash) {
    return json({ error: 'Admin password not configured' }, { status: 500 })
  }
  if (!env.SESSION_SECRET) {
    return json({ error: 'SESSION_SECRET not configured' }, { status: 500 })
  }

  let ok = false
  if (configuredHash) {
    const got = await sha256Hex(password)
    ok = constantTimeEqual(got, configuredHash)
  } else {
    ok = constantTimeEqual(password, configuredPlain)
  }

  if (!ok) {
    // Rate limiting should be enforced at Cloudflare (WAF/Rate Limiting rules).
    return json({ error: 'Invalid password' }, { status: 401 })
  }

  const setCookie = await issueAdminSessionCookie(request, env, { maxAgeSeconds: 86400 })
  return json(
    { success: true },
    {
      status: 200,
      headers: {
        'Set-Cookie': setCookie,
      },
    },
  )
}


