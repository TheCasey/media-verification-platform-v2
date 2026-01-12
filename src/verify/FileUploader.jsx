export default function FileUploader({
  minFiles,
  maxFiles,
  allowedFileTypes,
  onFilesSelected,
  disabled,
}) {
  const accept = Array.isArray(allowedFileTypes) ? allowedFileTypes.join(',') : undefined

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Upload files</div>
          <div className="text-xs text-slate-500">
            Min {minFiles}, max {maxFiles}. Allowed: {Array.isArray(allowedFileTypes) ? allowedFileTypes.join(', ') : 'any'}
          </div>
        </div>
      </div>

      <input
        type="file"
        multiple
        disabled={disabled}
        accept={accept}
        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
        onChange={(e) => {
          if (!e.target.files) return
          onFilesSelected(e.target.files)
          // allow selecting the same file again later
          e.target.value = ''
        }}
      />
    </div>
  )
}


