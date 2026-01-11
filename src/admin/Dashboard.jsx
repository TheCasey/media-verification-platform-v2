import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteProject, getProjects } from '../services/api.js'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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

  async function onDelete(project) {
    if (!confirm(`Deactivate "${project.name}"? (Submissions are retained)`)) return
    await deleteProject(project.id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
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
          {projects.map((p) => (
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
                Verification URL: <code className="font-mono">/verify/{p.id}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


