import { json } from './response.js'

function parseCookies(header) {
  if (!header) return {}
  const out = {}
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (!k) continue
    out[k] = rest.join('=') || ''
  }
  return out
}

function base64UrlEncode(bytes) {
  const bin = String.fromCharCode(...bytes)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function hmacSign(secret, messageBytes) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, messageBytes)
  return new Uint8Array(sig)
}

export async function verifyAdminSession(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies.admin_session
  if (!token) return false

  const secret = env.SESSION_SECRET
  if (!secret) return false

  const [payloadB64, sigB64] = token.split('.')
  if (!payloadB64 || !sigB64) return false

  let payloadBytes
  let sigBytes
  try {
    payloadBytes = base64UrlDecodeToBytes(payloadB64)
    sigBytes = base64UrlDecodeToBytes(sigB64)
  } catch {
    return false
  }

  const expectedSig = await hmacSign(secret, new TextEncoder().encode(payloadB64))
  if (!bytesEqual(expectedSig, sigBytes)) return false

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes))
    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== 'number' || payload.exp < now) return false
    if (typeof payload.iat !== 'number' || payload.iat > now + 60) return false
    return true
  } catch {
    return false
  }
}

export async function issueAdminSessionCookie(request, env, { maxAgeSeconds = 86400 } = {}) {
  const secret = env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = { iat: now, exp: now + maxAgeSeconds }
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const payloadB64 = base64UrlEncode(payloadBytes)
  const sigBytes = await hmacSign(secret, new TextEncoder().encode(payloadB64))
  const sigB64 = base64UrlEncode(sigBytes)
  const token = `${payloadB64}.${sigB64}`

  const url = new URL(request.url)
  const secure = url.protocol === 'https:'

  const attrs = [
    `admin_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (secure) attrs.push('Secure')
  return attrs.join('; ')
}

export async function requireAdmin(context) {
  const ok = await verifyAdminSession(context.request, context.env)
  if (!ok) return json({ error: 'Unauthorized' }, { status: 401 })
  return null
}


