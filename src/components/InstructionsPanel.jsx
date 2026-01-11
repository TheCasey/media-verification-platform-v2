export default function InstructionsPanel({ instructions }) {
  const items = instructions || {}

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Instructions</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(items).map(([key, text]) => (
          <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-medium text-slate-600 uppercase">{key}</div>
            <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{text || '—'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}


