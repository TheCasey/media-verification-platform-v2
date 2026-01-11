export async function extractVideoMetadata(file) {
  // Browser-only metadata extraction. Some fields may be unavailable depending on OS/device/codec.
  if (!file.type?.startsWith('video/')) {
    return { normalized: { kind: 'unknown' } }
  }

  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url

    await new Promise((resolve, reject) => {
      const onLoaded = () => resolve()
      const onErr = () => reject(new Error('Unable to read video metadata'))
      video.addEventListener('loadedmetadata', onLoaded, { once: true })
      video.addEventListener('error', onErr, { once: true })
    })

    const width = Number.isFinite(video.videoWidth) && video.videoWidth > 0 ? video.videoWidth : null
    const height = Number.isFinite(video.videoHeight) && video.videoHeight > 0 ? video.videoHeight : null
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null

    return {
      normalized: {
        kind: 'video',
        resolution: width !== null && height !== null ? { width, height } : null,
        durationSeconds: duration,
      },
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}


