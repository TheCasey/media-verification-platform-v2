import { json } from './response.js'

export function rejectIfTooLarge(request, { maxBytes }) {
  const len = request.headers.get('Content-Length')
  if (!len) return null
  const n = Number(len)
  if (!Number.isFinite(n)) return null
  if (n > maxBytes) {
    return json({ error: `Payload too large (max ${maxBytes} bytes)` }, { status: 413 })
  }
  return null
}



