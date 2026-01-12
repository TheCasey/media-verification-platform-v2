import { useState } from 'react'

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

function formatValue(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v || '—'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export default function SubmissionDetail({ submission, project }) {
  // UI-only state for on-demand geocoding results per file index.
  const [geoState, setGeoState] = useState({}) // { [idx]: { loading, error, data } }

  if (!submission) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Select a submission to view details.
      </div>
    )
  }

  const fileFields =
    project?.config?.adminDisplay?.fileFields && Array.isArray(project.config.adminDisplay.fileFields)
      ? project.config.adminDisplay.fileFields
      : [
          { label: 'GPS (lat)', path: 'metadata.gps.lat' },
          { label: 'GPS (lng)', path: 'metadata.gps.lng' },
          { label: 'Timestamp', path: 'metadata.timestamp' },
          { label: 'Resolution', path: 'metadata.resolution' },
          { label: 'Orientation', path: 'metadata.orientation' },
        ]

  const files = Array.isArray(submission?.data?.files) ? submission.data.files : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">Submission #{submission.id}</div>
        <div className="text-xs text-slate-500">{new Date(submission.submittedAt).toLocaleString()}</div>
      </div>
      <div className="p-4 space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-slate-600">Tester</div>
          <div className="text-slate-900">{submission.userName}</div>
          <div className="text-slate-600">{submission.userEmail}</div>
          <div className="text-slate-600">User ID: {submission.userId}</div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-600 mb-2">Files ({files.length})</div>
          <div className="space-y-3">
            {files.map((f, idx) => (
              <div key={`${f.filename || 'file'}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{f.filename || `File ${idx + 1}`}</div>
                    <div className="text-xs text-slate-500">
                      {f.type || 'unknown type'} {typeof f.size === 'number' ? `• ${Math.round(f.size / 1024)} KB` : ''}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {fileFields.map((field, fieldIdx) => (
                    <div key={`${field.label || field.path}-${fieldIdx}`} className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-600">{field.label || field.path}</div>
                      <div className="text-xs text-slate-900 font-mono text-right">
                        {formatValue(getByPath(f, field.path))}
                      </div>
                    </div>
                  ))}
                </div>

                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">Investigate</summary>
                  <div className="mt-2 space-y-2">
                    {f?.metadata?.gps?.lat != null && f?.metadata?.gps?.lng != null ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          disabled={geoState[idx]?.loading}
                          onClick={async () => {
                            const lat = f.metadata.gps.lat
                            const lng = f.metadata.gps.lng
                            setGeoState((s) => ({ ...s, [idx]: { loading: true, error: null, data: null } }))
                            try {
                              const res = await fetch(`/admin/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, {
                                credentials: 'include',
                              })
                              const data = await res.json().catch(() => ({}))
                              if (!res.ok) throw new Error(data?.error || 'Geocode failed')
                              setGeoState((s) => ({ ...s, [idx]: { loading: false, error: null, data } }))
                            } catch (e) {
                              setGeoState((s) => ({ ...s, [idx]: { loading: false, error: e?.message || 'Geocode failed', data: null } }))
                            }
                          }}
                        >
                          {geoState[idx]?.loading ? 'Resolving…' : 'Resolve location'}
                        </button>

                        {geoState[idx]?.error ? (
                          <div className="text-xs text-red-700">{geoState[idx].error}</div>
                        ) : null}

                        {geoState[idx]?.data ? (
                          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
                            <div className="font-medium text-slate-900">Resolved location</div>
                            <div className="mt-1">{geoState[idx].data.displayName || '—'}</div>
                            <div className="mt-1 text-slate-600">
                              {[
                                geoState[idx].data.city,
                                geoState[idx].data.county,
                                geoState[idx].data.state,
                                geoState[idx].data.country,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600">No GPS coordinates found for this file.</div>
                    )}

                    <details className="rounded-lg border border-slate-200 bg-white p-3">
                      <summary className="cursor-pointer text-xs font-medium text-slate-700">File JSON (debug)</summary>
                      <pre className="mt-2 overflow-auto text-xs text-slate-800">{JSON.stringify(f, null, 2)}</pre>
                    </details>
                  </div>
                </details>
              </div>
            ))}
            {files.length === 0 ? (
              <div className="text-sm text-slate-600">No file data found in this submission.</div>
            ) : null}
          </div>
        </div>

        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-700">Raw JSON (debug)</summary>
          <pre className="mt-2 overflow-auto text-xs text-slate-800">
            {JSON.stringify(submission.data, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}


