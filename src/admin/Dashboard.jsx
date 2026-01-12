import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteProject, getProjects } from '../services/api.js'

function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text)
  // fallback
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  el.remove()
  return Promise.resolve()
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('created_desc') // created_desc|created_asc|name_asc|name_desc

  async function load() {
    setError('')
    setLoading(true)
    try {
      const data = await getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sortedProjects = useMemo(() => {
    const items = [...projects]
    const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    const byCreated = (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    if (sortBy === 'name_asc') items.sort(byName)
    else if (sortBy === 'name_desc') items.sort((a, b) => byName(b, a))
    else if (sortBy === 'created_asc') items.sort(byCreated)
    else items.sort((a, b) => byCreated(b, a))
    return items
  }, [projects, sortBy])

  async function onDelete(project) {
    if (!confirm(`Deactivate "${project.name}"? (Submissions are retained)`)) return
    await deleteProject(project.id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
          <label className="text-xs text-slate-600">
            Sort:{' '}
            <select
              className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_desc">Date added (newest)</option>
              <option value="created_asc">Date added (oldest)</option>
              <option value="name_asc">Name (A→Z)</option>
              <option value="name_desc">Name (Z→A)</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => navigate('/admin/projects/new')}
        >
          New project
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No projects yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedProjects.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">ID: {p.id}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-600">
                Mode:{' '}
                <span className="font-medium text-slate-900">
                  {p?.config?.mode === 'self_check' ? 'Self-check' : 'Audit'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate(`/admin/projects/${p.id}/submissions`)}
                >
                  Submissions
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate(`/admin/projects/${p.id}/edit`)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(p)}
                >
                  Deactivate
                </button>
              </div>

              <div className="mt-3 text-xs text-slate-600">
                Submissions: <span className="font-medium text-slate-900">{p.submissionCount ?? 0}</span>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <div className="text-slate-500 mb-1">Verification URL</div>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono break-all">{window.location.origin}/verify/{p.id}</code>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={async () => {
                      await copyToClipboard(`${window.location.origin}/verify/${p.id}`)
                      setError('Copied verification URL to clipboard.')
                      setTimeout(() => setError(''), 1500)
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


