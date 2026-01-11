const jsonHeaders = { 'Content-Type': 'application/json' }

async function parseJsonOrThrow(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export async function adminLogin(password) {
  const res = await fetch('/admin/login', {
    method: 'POST',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify({ password }),
  })
  return parseJsonOrThrow(res)
}

export async function getProjects() {
  const res = await fetch('/admin/projects', { credentials: 'include' })
  return parseJsonOrThrow(res)
}

export async function createProject(payload) {
  const res = await fetch('/admin/projects', {
    method: 'POST',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow(res)
}

export async function getProject(id) {
  const res = await fetch(`/admin/project/${id}`, { credentials: 'include' })
  return parseJsonOrThrow(res)
}

export async function updateProject(id, payload) {
  const res = await fetch(`/admin/project/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow(res)
}

export async function deleteProject(id) {
  const res = await fetch(`/admin/project/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return parseJsonOrThrow(res)
}

export async function getSubmissions(projectId, userId) {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
  const res = await fetch(`/admin/project/${projectId}/submissions${qs}`, {
    credentials: 'include',
  })
  return parseJsonOrThrow(res)
}

export async function getProjectConfig(projectId) {
  const res = await fetch(`/api/project/${projectId}`)
  return parseJsonOrThrow(res)
}

export async function submitVerification(projectId, payload) {
  const res = await fetch(`/verify/${projectId}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow(res)
}


