import { requireAdmin } from '../_utils/auth.js'
import { json } from '../_utils/response.js'

/**
 * GET /admin/geocode?lat=..&lng=..
 * Admin-only reverse geocoding helper (no persistence).
 */
export async function onRequestGet(context) {
  const unauthorized = await requireAdmin(context)
  if (unauthorized) return unauthorized

  const { request } = context
  const url = new URL(request.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: 'lat and lng must be numbers' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return json({ error: 'lat/lng out of range' }, { status: 400 })
  }

  // Nominatim usage policies apply; this endpoint is intentionally on-demand and admin-only.
  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse')
  nominatimUrl.searchParams.set('format', 'jsonv2')
  nominatimUrl.searchParams.set('lat', String(lat))
  nominatimUrl.searchParams.set('lon', String(lng))
  nominatimUrl.searchParams.set('zoom', '18')
  nominatimUrl.searchParams.set('addressdetails', '1')

  const resp = await fetch(nominatimUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return json({ error: 'Geocoding provider error', status: resp.status, details: text }, { status: 502 })
  }

  const raw = await resp.json().catch(() => null)
  if (!raw) return json({ error: 'Invalid provider response' }, { status: 502 })

  const address = raw.address || {}
  const result = {
    displayName: raw.display_name || null,
    lat: raw.lat ? Number(raw.lat) : lat,
    lng: raw.lon ? Number(raw.lon) : lng,
    city: address.city || address.town || address.village || address.hamlet || null,
    county: address.county || null,
    state: address.state || null,
    country: address.country || null,
    postcode: address.postcode || null,
    raw,
  }

  return json(result, { status: 200 })
}


