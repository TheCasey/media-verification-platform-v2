import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, getSubmissions } from '../services/api.js'
import SubmissionDetail from './SubmissionDetail.jsx'

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n') + '\n'
}

export default function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [selected, setSelected] = useState(null)
  const [userIdFilter, setUserIdFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const canFilter = useMemo(() => userIdFilter.trim().length > 0, [userIdFilter])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [p, s] = await Promise.all([getProject(id), getSubmissions(id, canFilter ? userIdFilter.trim() : '')])
      setProject(p)
      setSubmissions(Array.isArray(s) ? s : [])
      setSelected(null)
    } catch (err) {
      setError(err?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [canFilter, id, userIdFilter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{project?.name || 'Project'}</h2>
          <div className="text-xs text-slate-500">Submissions</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading || submissions.length === 0}
            onClick={() => {
              const filename = `submissions_${id}_${new Date().toISOString().slice(0, 10)}.json`
              downloadText(filename, JSON.stringify(submissions, null, 2), 'application/json')
            }}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading || submissions.length === 0}
            onClick={() => {
              const header = ['submission_id', 'user_name', 'user_email', 'user_id', 'submitted_at', 'file_count']
              const rows = submissions.map((s) => [
                s.id,
                s.userName,
                s.userEmail,
                s.userId,
                s.submittedAt,
                Array.isArray(s?.data?.files) ? s.data.files.length : '',
              ])
              const filename = `submissions_${id}_${new Date().toISOString().slice(0, 10)}.csv`
              downloadText(filename, toCsv([header, ...rows]), 'text/csv')
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => navigate(`/admin/projects/${id}/edit`)}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => navigate('/admin/dashboard')}
          >
            Back
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Filter by user_id</span>
          <input
            className="mt-1 w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder="e.g. 12345"
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
          onClick={load}
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No submissions.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
              Submissions ({submissions.length})
            </div>
            <div className="divide-y divide-slate-200">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-slate-50"
                  onClick={() => setSelected(s)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{s.userName}</div>
                      <div className="text-xs text-slate-500">User ID: {s.userId}</div>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(s.submittedAt).toLocaleString()}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <SubmissionDetail submission={selected} />
        </div>
      )}
    </div>
  )
}


