import type { GeoPoint } from './osm-elevation'
import { getGeocodeRequest } from './map-data-source'

export type GeocodeResult = {
	label: string
	lat: number
	lon: number
}

/** Accepts pasted "lat, lon" text (e.g. from Google Maps) as a search shortcut. */
export function parseLatLonInput(text: string): GeoPoint | null {
	const match = text
		.trim()
		.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/)
	if (!match) return null
	const lat = Number(match[1])
	const lon = Number(match[2])
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
	if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
	return { lat, lon }
}

export async function searchPlaces(
	query: string,
	options: { signal?: AbortSignal } = {},
): Promise<GeocodeResult[]> {
	const direct = parseLatLonInput(query)
	if (direct) {
		return [
			{
				label: `${direct.lat.toFixed(5)}, ${direct.lon.toFixed(5)}`,
				lat: direct.lat,
				lon: direct.lon,
			},
		]
	}
	const request = getGeocodeRequest(query.trim())
	const response = await fetch(request.url, {
		...request.init,
		signal: options.signal,
	})
	if (!response.ok) {
		throw new Error(`Place search failed (HTTP ${response.status}).`)
	}
	const results = (await response.json()) as Array<{
		display_name?: string
		lat?: string
		lon?: string
	}>
	return results.flatMap((result) => {
		const lat = Number(result.lat)
		const lon = Number(result.lon)
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []
		return [{ label: result.display_name ?? `${lat}, ${lon}`, lat, lon }]
	})
}
