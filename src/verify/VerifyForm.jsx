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

  const [files, setFiles] = useState([]) // [{ key, file, metadata, validation }]
  const [inlineHint, setInlineHint] = useState('')

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

  function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified || 0}`
  }

  async function onFilesSelected(fileList) {
    setResult(null)
    setInlineHint('')
    if (!config) return

    const maxFiles = Number(config.maxFiles || 0)
    const incoming = Array.from(fileList)
    const existingKeys = new Set(files.map((f) => f.key))

    const newFiles = incoming.filter((f) => !existingKeys.has(fileKey(f)))
    if (newFiles.length === 0) {
      setInlineHint('Those files are already in your queue.')
      return
    }

    const room = Number.isFinite(maxFiles) && maxFiles > 0 ? Math.max(0, maxFiles - files.length) : newFiles.length
    const accepted = newFiles.slice(0, room)

    if (accepted.length === 0) {
      setInlineHint(`You already have the maximum of ${maxFiles} files in your queue.`)
      return
    }
    if (accepted.length < newFiles.length) {
      setInlineHint(`Only ${accepted.length} file(s) were added (max ${maxFiles}).`)
    }

    const processed = await Promise.all(
      accepted.map(async (file) => {
        const metadata = file.type?.startsWith('video/')
          ? await extractVideoMetadata(file)
          : await extractFileMetadata(file)
        const validation = validateMetadata(metadata, config.metadataRequirements || {})
        return { key: fileKey(file), file, metadata, validation }
      }),
    )

    setFiles((prev) => [...prev, ...processed])
  }

  function removeFile(key) {
    setFiles((prev) => prev.filter((f) => f.key !== key))
  }

  const hardPassingCount = useMemo(
    () => files.filter((f) => f.validation?.hardPass === true).length,
    [files],
  )

  const mode = config?.mode || 'audit'
  const isSelfCheck = mode === 'self_check'

  const emailOk = useMemo(() => {
    if (!userEmail.trim()) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())
  }, [userEmail])

  const canSubmit = useMemo(() => {
    if (!config) return false
    if ((config.mode || 'audit') === 'self_check') return false
    if (!userName.trim() || !userEmail.trim() || !userId.trim()) return false
    if (!/^[0-9]+$/.test(userId.trim())) return false
    return hardPassingCount >= (config.requiredFiles || 0) && !submitting
  }, [config, hardPassingCount, submitting, userEmail, userId, userName])

  const checklist = useMemo(() => {
    const required = Number(config?.requiredFiles || 0)
    return [
      { label: 'Name entered', ok: !!userName.trim() },
      { label: 'Email looks valid', ok: emailOk },
      { label: 'User ID is numbers only', ok: !!userId.trim() && /^[0-9]+$/.test(userId.trim()) },
      { label: `At least ${required} hard-passing files`, ok: hardPassingCount >= required },
    ]
  }, [config, emailOk, hardPassingCount, userId, userName])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!config) return
    if ((config.mode || 'audit') === 'self_check') return

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
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  if (result?.ok) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-green-200 bg-white p-8 shadow-sm">
            <div className="text-2xl font-semibold text-slate-900">Thank you</div>
            <div className="mt-2 text-slate-700">
              Your submission was received successfully.
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => {
                  setResult(null)
                  setError('')
                  setInlineHint('')
                  setUserName('')
                  setUserEmail('')
                  setUserId('')
                  setFiles([])
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                Submit another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          {!isSelfCheck ? (
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
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">Self-check mode:</span> this project does not collect your
                identity or store submissions. Upload files to see if they meet the requirements.
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <FileUploader
              minFiles={config.requiredFiles}
              maxFiles={config.maxFiles}
              allowedFileTypes={config.allowedFileTypes}
              onFilesSelected={onFilesSelected}
              disabled={submitting}
            />
            {inlineHint ? <div className="text-xs text-slate-600">{inlineHint}</div> : null}
            <div className="text-xs text-slate-500">
              Hard-passing files: {hardPassingCount} / {config.requiredFiles}
            </div>
          </section>

          {files.length ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Validation</h2>
              <div className="space-y-3">
                {files.map((f) => (
                  <div key={f.key} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">{f.file.name}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-600">{f.validation?.hardPass ? 'Hard pass' : 'Needs work'}</div>
                        <button
                          type="button"
                          className="text-xs text-red-700 hover:text-red-900"
                          onClick={() => removeFile(f.key)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <MetadataValidator
                      requirements={config.metadataRequirements}
                      fileMetadata={f.metadata}
                      validationResults={f.validation}
                      showMetadataJson={false}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!isSelfCheck ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">Ready to submit</div>
                <div className="text-xs text-slate-600">Submit is enabled once the following are satisfied:</div>
              </div>
              <ul className="space-y-1 text-sm">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center justify-between">
                    <span className="text-slate-700">{item.label}</span>
                    <span className={`text-xs font-medium ${item.ok ? 'text-green-700' : 'text-slate-500'}`}>
                      {item.ok ? 'OK' : 'Missing'}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit verification'}
              </button>
              {!canSubmit ? (
                <div className="text-xs text-slate-600">
                  Fix the missing items above to enable submit.
                </div>
              ) : null}
            </section>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
              {hardPassingCount >= (config.requiredFiles || 0) ? (
                <div>
                  <div className="font-medium text-slate-900">All checks passed.</div>
                  <div className="text-slate-600">You can now proceed with your normal upload flow.</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-slate-900">Not ready yet.</div>
                  <div className="text-slate-600">
                    You need {config.requiredFiles} hard-passing files. Currently: {hardPassingCount}.
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}


