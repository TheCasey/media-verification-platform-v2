import { useMemo, useState } from 'react'

function getByPath(obj, path) {
  if (!path) return undefined
  const parts = String(path).split('.').filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n') + '\n'
}

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

const DEFAULT_FIELDS_SUBMISSIONS = [
  { label: 'submission_id', path: 'submission.id' },
  { label: 'user_name', path: 'submission.userName' },
  { label: 'user_email', path: 'submission.userEmail' },
  { label: 'user_id', path: 'submission.userId' },
  { label: 'submitted_at', path: 'submission.submittedAt' },
  { label: 'file_count', path: 'submission.data.files.length' },
]

const DEFAULT_FIELDS_FILES = [
  { label: 'submission_id', path: 'submission.id' },
  { label: 'user_id', path: 'submission.userId' },
  { label: 'submitted_at', path: 'submission.submittedAt' },
  { label: 'filename', path: 'file.filename' },
  { label: 'type', path: 'file.type' },
  { label: 'size', path: 'file.size' },
  { label: 'gps_lat', path: 'file.metadata.gps.lat' },
  { label: 'gps_lng', path: 'file.metadata.gps.lng' },
  { label: 'timestamp', path: 'file.metadata.timestamp' },
  { label: 'resolution_width', path: 'file.metadata.resolution.width' },
  { label: 'resolution_height', path: 'file.metadata.resolution.height' },
]

export default function ExportModal({ open, onClose, submissions, projectId }) {
  const [format, setFormat] = useState('csv') // csv|json
  const [rowType, setRowType] = useState('submissions') // submissions|files
  const [fields, setFields] = useState(DEFAULT_FIELDS_SUBMISSIONS)
  const [customJsonText, setCustomJsonText] = useState('{}')
  const [flattenObjects, setFlattenObjects] = useState(true)
  const [error, setError] = useState('')

  const rows = useMemo(() => {
    const list = Array.isArray(submissions) ? submissions : []
    if (rowType === 'submissions') {
      return list.map((submission) => ({ submission }))
    }

    // files: one row per file across submissions
    const out = []
    for (const submission of list) {
      const files = Array.isArray(submission?.data?.files) ? submission.data.files : []
      for (const file of files) {
        out.push({ submission, file })
      }
    }
    return out
  }, [rowType, submissions])

  const preview = useMemo(() => {
    const sample = rows.slice(0, 5)
    let custom = {}
    try {
      custom = JSON.parse(customJsonText || '{}')
    } catch {
      custom = null
    }

    const built = sample.map((ctx) => {
      const obj = {}
      for (const f of fields) {
        const val = getByPath(ctx, f.path)
        if (val && typeof val === 'object' && flattenObjects) obj[f.label] = JSON.stringify(val)
        else obj[f.label] = val ?? null
      }
      if (custom && typeof custom === 'object') Object.assign(obj, custom)
      return obj
    })
    return { built, customOk: custom !== null }
  }, [customJsonText, fields, flattenObjects, rows])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto max-w-5xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <div className="text-sm font-semibold text-slate-900">Export</div>
              <div className="text-xs text-slate-500">Preview and customize before downloading.</div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="p-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Format</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Rows</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={rowType}
                    onChange={(e) => {
                      const next = e.target.value
                      setRowType(next)
                      setFields(next === 'files' ? DEFAULT_FIELDS_FILES : DEFAULT_FIELDS_SUBMISSIONS)
                    }}
                  >
                    <option value="submissions">Submissions (one row per submission)</option>
                    <option value="files">Files (one row per file)</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={flattenObjects} onChange={(e) => setFlattenObjects(e.target.checked)} />
                Flatten objects/arrays to JSON strings
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Fields</div>
                    <div className="text-xs text-slate-500">
                      Paths are resolved against <code className="font-mono">submission</code> and (for file rows) <code className="font-mono">file</code>.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setFields((prev) => [...prev, { label: '', path: '' }])}
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div key={`${f.label}-${idx}`} className="grid gap-2 md:grid-cols-12 items-end">
                      <div className="md:col-span-4">
                        <div className="text-xs font-medium text-slate-600">Label</div>
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={f.label}
                          onChange={(e) => {
                            const next = [...fields]
                            next[idx] = { ...next[idx], label: e.target.value }
                            setFields(next)
                          }}
                        />
                      </div>
                      <div className="md:col-span-6">
                        <div className="text-xs font-medium text-slate-600">Path</div>
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                          value={f.path}
                          onChange={(e) => {
                            const next = [...fields]
                            next[idx] = { ...next[idx], path: e.target.value }
                            setFields(next)
                          }}
                          placeholder={rowType === 'files' ? 'file.metadata.timestamp' : 'submission.userId'}
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return
                            const next = [...fields]
                            ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                            setFields(next)
                          }}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                          disabled={idx === fields.length - 1}
                          onClick={() => {
                            if (idx === fields.length - 1) return
                            const next = [...fields]
                            ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                            setFields(next)
                          }}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-300 bg-white px-2 py-2 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const next = [...fields]
                            next.splice(idx, 1)
                            setFields(next)
                          }}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Custom JSON tags (optional)</div>
                  <div className="text-xs text-slate-500">
                    This object will be merged into each exported row.
                  </div>
                </div>
                <textarea
                  className={`w-full min-h-[120px] rounded-lg border px-3 py-2 text-xs font-mono ${
                    preview.customOk ? 'border-slate-300 bg-slate-50' : 'border-red-300 bg-red-50'
                  }`}
                  value={customJsonText}
                  onChange={(e) => setCustomJsonText(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => {
                  setError('')
                  let custom = {}
                  try {
                    custom = JSON.parse(customJsonText || '{}')
                  } catch {
                    setError('Custom JSON is invalid.')
                    return
                  }

                  const built = rows.map((ctx) => {
                    const obj = {}
                    for (const f of fields) {
                      const val = getByPath(ctx, f.path)
                      if (val && typeof val === 'object' && flattenObjects) obj[f.label] = JSON.stringify(val)
                      else obj[f.label] = val ?? null
                    }
                    if (custom && typeof custom === 'object') Object.assign(obj, custom)
                    return obj
                  })

                  const date = new Date().toISOString().slice(0, 10)
                  const baseName = `export_${projectId}_${rowType}_${date}`

                  if (format === 'json') {
                    downloadText(`${baseName}.json`, JSON.stringify(built, null, 2), 'application/json')
                    return
                  }

                  const header = fields.map((f) => f.label)
                  const csvRows = built.map((obj) => header.map((h) => obj[h]))
                  downloadText(`${baseName}.csv`, toCsv([header, ...csvRows]), 'text/csv')
                }}
              >
                Download export
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Preview (first 5 rows)</div>
                <div className="text-xs text-slate-500">
                  This shows how your chosen fields will resolve.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-2 text-xs text-slate-600">
                  Rows: {rows.length}
                </div>
                <div className="p-4">
                  <pre className="overflow-auto text-xs text-slate-800">
                    {JSON.stringify(preview.built, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


