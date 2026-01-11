export function json(body, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

export function notImplemented(message = 'Not implemented') {
  return json({ error: message }, { status: 501 })
}


