import ValidationStatus from './ValidationStatus.jsx'

export default function MetadataValidator({ requirements, fileMetadata, validationResults }) {
  const reqs = requirements || {}
  const perRule = validationResults?.perRule || {}

  return (
    <div className="mt-3 space-y-2">
      {Object.entries(reqs).map(([key, rule]) => {
        const result = perRule[key] || { status: 'fail' }
        return (
          <ValidationStatus
            key={key}
            label={key}
            status={result.status}
            description={rule?.description}
          />
        )
      })}

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-700">Metadata (normalized)</summary>
        <pre className="mt-2 overflow-auto text-xs text-slate-800">
          {JSON.stringify(fileMetadata?.normalized || fileMetadata || {}, null, 2)}
        </pre>
      </details>
    </div>
  )
}


