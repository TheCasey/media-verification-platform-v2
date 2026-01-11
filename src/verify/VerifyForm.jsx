import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectConfig, submitVerification } from '../services/api.js'
import FileUploader from './FileUploader.jsx'
import InstructionsPanel from '../components/InstructionsPanel.jsx'
import MetadataValidator from '../components/MetadataValidator.jsx'
import { extractFileMetadata } from '../utils/exifExtractor.js'
import { extractVideoMetadata } from '../utils/videoMetadata.js'
import { validateMetadata } from '../utils/metadataValidator.js'

export default function VerifyForm() {
  const { projectId } = useParams()
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')

  const [files, setFiles] = useState([]) // [{ file, metadata, validation }]

  useEffect(() => {
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const cfg = await getProjectConfig(projectId)
        setConfig(cfg)
      } catch (err) {
        setError(err?.message || 'Failed to load project config')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  async function onFilesSelected(fileList) {
    setResult(null)
    if (!config) return
    const selected = Array.from(fileList).slice(0, Number(config.maxFiles || 0) || undefined)
    const processed = await Promise.all(
      selected.map(async (file) => {
        const metadata = file.type?.startsWith('video/') ? await extractVideoMetadata(file) : await extractFileMetadata(file)
        const validation = validateMetadata(metadata, config.metadataRequirements || {})
        return { file, metadata, validation }
      }),
    )
    setFiles(processed)
  }

  const hardPassingCount = useMemo(
    () => files.filter((f) => f.validation?.hardPass === true).length,
    [files],
  )

  const canSubmit = useMemo(() => {
    if (!config) return false
    if (!userName.trim() || !userEmail.trim() || !userId.trim()) return false
    if (!/^[0-9]+$/.test(userId.trim())) return false
    return hardPassingCount >= (config.requiredFiles || 0) && !submitting
  }, [config, hardPassingCount, submitting, userEmail, userId, userName])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!config) return

    setSubmitting(true)
    try {
      const payload = {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userId: userId.trim(),
        files: files.filter((f) => f.validation?.hardPass === true).map((f) => ({
          filename: f.file.name,
          type: f.file.type,
          size: f.file.size,
          metadata: f.metadata?.normalized || f.metadata,
          validation: f.validation?.summary || f.validation,
        })),
      }
      await submitVerification(projectId, payload)
      setResult({ ok: true, message: 'Submitted successfully.' })
    } catch (err) {
      setResult({ ok: false, message: err?.message || 'Submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-sm text-slate-700">Loading…</div>
  }
  if (error) {
    return <div className="min-h-screen bg-slate-50 p-6 text-sm text-red-700">{error}</div>
  }
  if (!config) return null

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">{config.name || 'Verification'}</h1>
          <p className="text-sm text-slate-600">Upload a few representative files to validate metadata.</p>
        </header>

        {result ? (
          <div
            className={`rounded-xl border p-4 text-sm ${
              result.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {result.message}
          </div>
        ) : null}

        {config.instructions ? <InstructionsPanel instructions={config.instructions} /> : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Your info</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Email</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  type="email"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">User ID (numbers only)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <FileUploader
              minFiles={config.requiredFiles}
              maxFiles={config.maxFiles}
              allowedFileTypes={config.allowedFileTypes}
              onFilesSelected={onFilesSelected}
              disabled={submitting}
            />
            <div className="text-xs text-slate-500">
              Hard-passing files: {hardPassingCount} / {config.requiredFiles}
            </div>
          </section>

          {files.length ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Validation</h2>
              <div className="space-y-3">
                {files.map((f) => (
                  <div key={f.file.name} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">{f.file.name}</div>
                      <div className="text-xs text-slate-600">{f.validation?.hardPass ? 'Hard pass' : 'Needs work'}</div>
                    </div>
                    <MetadataValidator
                      requirements={config.metadataRequirements}
                      fileMetadata={f.metadata}
                      validationResults={f.validation}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit verification'}
          </button>
        </form>
      </div>
    </div>
  )
}


