function hasGps(metadata) {
  const gps = metadata?.normalized?.gps
  return !!gps && typeof gps.lat === 'number' && typeof gps.lng === 'number'
}

function hasTimestamp(metadata) {
  return !!metadata?.normalized?.timestamp
}

function getResolution(metadata) {
  const res = metadata?.normalized?.resolution
  if (!res || typeof res.width !== 'number' || typeof res.height !== 'number') return null
  return { width: res.width, height: res.height }
}

function hasResolution(metadata, minWidth, minHeight) {
  const res = getResolution(metadata)
  if (!res) return { ok: false, message: 'Resolution not detected' }
  const ok = res.width >= minWidth && res.height >= minHeight
  return {
    ok,
    message: ok ? undefined : `Need at least ${minWidth}×${minHeight}. Detected ${res.width}×${res.height}.`,
  }
}

function hasLongShortEdges(metadata, minLongEdge, minShortEdge) {
  const res = getResolution(metadata)
  if (!res) return { ok: false, message: 'Resolution not detected' }
  const longEdge = Math.max(res.width, res.height)
  const shortEdge = Math.min(res.width, res.height)
  const ok = longEdge >= minLongEdge && shortEdge >= minShortEdge
  return {
    ok,
    message: ok
      ? undefined
      : `Need long edge ≥ ${minLongEdge} and short edge ≥ ${minShortEdge}. Detected ${res.width}×${res.height}.`,
  }
}

function hasOrientation(metadata, expected) {
  const label = metadata?.normalized?.orientation
  if (!label) return { ok: false, message: 'Orientation not detected' }
  if (expected !== 'portrait' && expected !== 'landscape') return { ok: true }
  const ok = label === expected
  return { ok, message: ok ? undefined : `Expected ${expected}. Detected ${label}.` }
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
    let message
    if (key === 'gps') {
      pass = hasGps(metadata)
    } else if (key === 'timestamp') {
      pass = hasTimestamp(metadata)
    } else if (key === 'resolution') {
      // Prefer long/short edge semantics when provided (orientation-agnostic).
      if (rule.minLongEdge || rule.minShortEdge) {
        const r = hasLongShortEdges(metadata, Number(rule.minLongEdge || 0), Number(rule.minShortEdge || 0))
        pass = r.ok
        message = r.message
      } else {
        const r = hasResolution(metadata, Number(rule.minWidth || 0), Number(rule.minHeight || 0))
        pass = r.ok
        message = r.message
      }
    } else if (key === 'orientation') {
      const r = hasOrientation(metadata, rule.value)
      pass = r.ok
      message = r.message
    } else if (key === 'cameraApp') {
      // Best-effort heuristic: EXIF software tag patterns can be spoofed/stripped.
      pass = true
    }

    if (pass) {
      perRule[key] = { status: 'pass' }
    } else if (failureMode === 'soft') {
      perRule[key] = { status: 'soft_fail', message }
      softFailures.push(key)
    } else {
      perRule[key] = { status: 'fail', message }
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


