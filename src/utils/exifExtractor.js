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
      'Orientation',
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

  const rawWidth = safeNumber(raw?.ImageWidth ?? raw?.PixelXDimension)
  const rawHeight = safeNumber(raw?.ImageHeight ?? raw?.PixelYDimension)
  const orientation = safeNumber(raw?.Orientation)

  // Many phones store pixels in one orientation and rely on EXIF Orientation for display.
  const swapsAxes = orientation === 6 || orientation === 8
  const width = rawWidth !== null && rawHeight !== null ? (swapsAxes ? rawHeight : rawWidth) : null
  const height = rawWidth !== null && rawHeight !== null ? (swapsAxes ? rawWidth : rawHeight) : null
  const orientationLabel =
    width !== null && height !== null
      ? height > width
        ? 'portrait'
        : width > height
          ? 'landscape'
          : 'square'
      : null

  return {
    normalized: {
      kind: 'image',
      gps: lat !== null && lng !== null ? { lat, lng } : null,
      timestamp: pickTimestamp(raw),
      resolution: width !== null && height !== null ? { width, height } : null,
      exifOrientation: orientation ?? null,
      orientation: orientationLabel,
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


