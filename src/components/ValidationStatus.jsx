export default function ValidationStatus({ label, status, description }) {
  const pill =
    status === 'pass'
      ? 'bg-green-100 text-green-800 border-green-200'
      : status === 'soft_fail'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200'

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {description ? <div className="text-xs text-slate-500 mt-1">{description}</div> : null}
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${pill}`}>
        {status === 'pass' ? 'Pass' : status === 'soft_fail' ? 'Soft fail' : 'Fail'}
      </span>
    </div>
  )
}


