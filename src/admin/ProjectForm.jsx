import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createProject, getProject, updateProject } from '../services/api.js'

const defaultConfig = {
  requiredFiles: 3,
  maxFiles: 5,
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/heic', 'video/mp4'],
  metadataRequirements: {
    gps: { required: true, failureMode: 'hard', description: 'GPS metadata must be present and readable' },
    timestamp: { required: true, failureMode: 'soft', description: 'Timestamp should be present' },
  },
  instructions: { ios: '', android: '', desktop: '' },
  emailRecipient: '',
}

export default function ProjectForm() {
  const { id } = useParams()
  const isEdit = useMemo(() => !!id, [id])
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [active, setActive] = useState(true)
  const [configText, setConfigText] = useState(JSON.stringify(defaultConfig, null, 2))

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const project = await getProject(id)
        setName(project?.name || '')
        setActive(Boolean(project?.active))
        setConfigText(JSON.stringify(project?.config || defaultConfig, null, 2))
      } catch (err) {
        setError(err?.message || 'Failed to load project')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const config = JSON.parse(configText)
      const payload = { name, config, active }
      const saved = isEdit ? await updateProject(id, payload) : await createProject(payload)
      navigate(`/admin/projects/${saved.id}/submissions`)
    } catch (err) {
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">{isEdit ? 'Edit project' : 'New project'}</h2>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => navigate('/admin/dashboard')}
        >
          Back
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Project name</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">Project config (JSON)</div>
                <div className="text-xs text-slate-500">
                  For now this is raw JSON; later we can build a structured form UI.
                </div>
              </div>
            </div>
            <textarea
              className="w-full min-h-[420px] rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save project'}
          </button>
        </form>
      )}
    </div>
  )
}


