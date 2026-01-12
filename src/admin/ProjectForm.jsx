import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createProject, getProject, updateProject } from '../services/api.js'

const defaultConfig = {
  mode: 'audit',
  requiredFiles: 3,
  maxFiles: 5,
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/heic', 'video/mp4'],
  capturePolicy: {
    // When you later choose to capture richer EXIF, exclude serial numbers by default.
    // (We can refine this list as you test real files.)
    excludeExifTags: ['BodySerialNumber', 'CameraSerialNumber', 'SerialNumber', 'LensSerialNumber'],
  },
  adminDisplay: {
    fileFields: [
      { label: 'GPS (lat)', path: 'metadata.gps.lat' },
      { label: 'GPS (lng)', path: 'metadata.gps.lng' },
      { label: 'Timestamp', path: 'metadata.timestamp' },
      { label: 'Resolution (w)', path: 'metadata.resolution.width' },
      { label: 'Resolution (h)', path: 'metadata.resolution.height' },
      { label: 'Orientation', path: 'metadata.orientation' },
    ],
  },
  metadataRequirements: {
    gps: { required: true, failureMode: 'hard', description: 'GPS metadata must be present and readable' },
    timestamp: { required: true, failureMode: 'soft', description: 'Timestamp should be present' },
  },
  instructions: { ios: '', android: '', desktop: '' },
  emailRecipient: '',
}

function getModeFromConfigText(configText) {
  try {
    const cfg = JSON.parse(configText)
    return cfg?.mode === 'self_check' ? 'self_check' : 'audit'
  } catch {
    return 'audit'
  }
}

function setModeInConfigText(configText, nextMode) {
  try {
    const cfg = JSON.parse(configText)
    const updated = { ...(cfg || {}), mode: nextMode }
    return JSON.stringify(updated, null, 2)
  } catch {
    // If JSON is invalid, don't mutate the text (avoid making it worse)
    return configText
  }
}

function getAdminDisplayFields(configText) {
  try {
    const cfg = JSON.parse(configText)
    const fields = cfg?.adminDisplay?.fileFields
    if (!Array.isArray(fields)) return []
    return fields
      .filter((f) => f && typeof f === 'object')
      .map((f) => ({ label: String(f.label || ''), path: String(f.path || '') }))
      .filter((f) => f.label || f.path)
  } catch {
    return []
  }
}

function setAdminDisplayFields(configText, nextFields) {
  try {
    const cfg = JSON.parse(configText)
    const updated = {
      ...(cfg || {}),
      adminDisplay: {
        ...((cfg || {}).adminDisplay || {}),
        fileFields: nextFields,
      },
    }
    return JSON.stringify(updated, null, 2)
  } catch {
    return configText
  }
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

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Mode</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                value={getModeFromConfigText(configText)}
                onChange={(e) => setConfigText(setModeInConfigText(configText, e.target.value))}
              >
                <option value="audit">Audit (store submissions)</option>
                <option value="self_check">Self-check (no storage)</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Self-check projects hide identity fields and never store submissions; users can only validate locally.
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Admin display fields (per file)</div>
              <div className="text-xs text-slate-500">
                Choose which metadata fields show up when reviewing submissions. These paths read from stored
                submission file objects (e.g. <code className="font-mono">metadata.timestamp</code>).
              </div>
            </div>

            <div className="space-y-2">
              {getAdminDisplayFields(configText).map((field, idx, arr) => (
                <div key={`${field.label}-${idx}`} className="grid gap-2 md:grid-cols-5 items-end">
                  <label className="block md:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Label</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={field.label}
                      onChange={(e) => {
                        const next = [...arr]
                        next[idx] = { ...next[idx], label: e.target.value }
                        setConfigText(setAdminDisplayFields(configText, next))
                      }}
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Path</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                      value={field.path}
                      onChange={(e) => {
                        const next = [...arr]
                        next[idx] = { ...next[idx], path: e.target.value }
                        setConfigText(setAdminDisplayFields(configText, next))
                      }}
                      placeholder="metadata.gps.lat"
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const next = [...arr]
                      next.splice(idx, 1)
                      setConfigText(setAdminDisplayFields(configText, next))
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const current = getAdminDisplayFields(configText)
                const next = [...current, { label: '', path: '' }]
                setConfigText(setAdminDisplayFields(configText, next))
              }}
            >
              Add field
            </button>
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


