export default function SubmissionDetail({ submission }) {
  if (!submission) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Select a submission to view details.
      </div>
    )
  }

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


