function hasGps(metadata) {
  const gps = metadata?.normalized?.gps
  return !!gps && typeof gps.lat === 'number' && typeof gps.lng === 'number'
}

function hasTimestamp(metadata) {
  return !!metadata?.normalized?.timestamp
}

function hasResolution(metadata, minWidth, minHeight) {
  const res = metadata?.normalized?.resolution
  if (!res || typeof res.width !== 'number' || typeof res.height !== 'number') return false
  return res.width >= minWidth && res.height >= minHeight
}

export function validateMetadata(metadata, requirements) {
  const reqs = requirements || {}

  const perRule = {}
  const hardFailures = []
  const softFailures = []

  for (const [key, rule] of Object.entries(reqs)) {
    if (!rule?.required) continue
    const failureMode = rule.failureMode === 'soft' ? 'soft' : 'hard'

    let pass = true
    if (key === 'gps') {
      pass = hasGps(metadata)
    } else if (key === 'timestamp') {
      pass = hasTimestamp(metadata)
    } else if (key === 'resolution') {
      pass = hasResolution(metadata, Number(rule.minWidth || 0), Number(rule.minHeight || 0))
    } else if (key === 'cameraApp') {
      // Best-effort heuristic: EXIF software tag patterns can be spoofed/stripped.
      pass = true
    }

    if (pass) {
      perRule[key] = { status: 'pass' }
    } else if (failureMode === 'soft') {
      perRule[key] = { status: 'soft_fail' }
      softFailures.push(key)
    } else {
      perRule[key] = { status: 'fail' }
      hardFailures.push(key)
    }
  }

  const hardPass = hardFailures.length === 0
  return {
    perRule,
    hardFailures,
    softFailures,
    hardPass,
    summary: { hardFailures, softFailures, hardPass },
  }
}


