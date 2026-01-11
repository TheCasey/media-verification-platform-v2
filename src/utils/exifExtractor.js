import * as exifr from 'exifr'

function safeNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function pickTimestamp(raw) {
  const candidates = [raw?.DateTimeOriginal, raw?.CreateDate, raw?.ModifyDate, raw?.datetime, raw?.createdate]
  const first = candidates.find(Boolean)
  if (!first) return null
  const d = first instanceof Date ? first : new Date(first)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function extractImageExif(file) {
  // Keep this intentionally conservative: avoid large blocks/makernotes/thumbs.
  const raw = await exifr.parse(file, {
    gps: true,
    pick: [
      'Make',
      'Model',
      'Software',
      'DateTimeOriginal',
      'CreateDate',
      'ModifyDate',
      'ImageWidth',
      'ImageHeight',
      'PixelXDimension',
      'PixelYDimension',
      'latitude',
      'longitude',
      'GPSLatitude',
      'GPSLongitude',
    ],
  })

  const lat = safeNumber(raw?.latitude ?? raw?.GPSLatitude)
  const lng = safeNumber(raw?.longitude ?? raw?.GPSLongitude)

  const width = safeNumber(raw?.ImageWidth ?? raw?.PixelXDimension)
  const height = safeNumber(raw?.ImageHeight ?? raw?.PixelYDimension)

  return {
    normalized: {
      kind: 'image',
      gps: lat !== null && lng !== null ? { lat, lng } : null,
      timestamp: pickTimestamp(raw),
      resolution: width !== null && height !== null ? { width, height } : null,
      camera: {
        make: raw?.Make || null,
        model: raw?.Model || null,
        software: raw?.Software || null,
      },
    },
  }
}

export async function extractFileMetadata(file) {
  if (file.type?.startsWith('image/')) {
    return extractImageExif(file)
  }
  // videos handled by videoMetadata util; caller can merge
  return { normalized: { kind: 'unknown' } }
}


