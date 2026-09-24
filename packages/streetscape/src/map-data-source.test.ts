import { afterEach, describe, expect, test } from 'bun:test'
import {
	configureMapImportGateway,
	getElevationTileUrl,
	getGeocodeRequest,
	getRasterTileUrl,
	getStreetRequest,
} from './map-data-source'

afterEach(() => configureMapImportGateway(null))

describe('map data source', () => {
	test('uses public services directly by default', () => {
		expect(getGeocodeRequest('New Delhi').url).toContain(
			'https://nominatim.openstreetmap.org/search?',
		)
		expect(getRasterTileUrl(5, 12, 9)).toBe(
			'https://tile.openstreetmap.org/5/12/9.png',
		)
		expect(getElevationTileUrl(15, 5241, 12667)).toBe(
			'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/15/5241/12667.png',
		)
		const streets = getStreetRequest(
			{ south: 1, west: 2, north: 3, east: 4 },
			'overpass query',
		)
		expect(streets.url).toBe('https://overpass-api.de/api/interpreter')
		expect(streets.init).toMatchObject({ method: 'POST' })
	})

	test('routes every map resource through a configured gateway', () => {
		configureMapImportGateway('/api/map/')
		expect(getGeocodeRequest('New Delhi').url).toBe('/api/map/geocode?q=New+Delhi')
		expect(getRasterTileUrl(5, 12, 9)).toBe('/api/map/tiles/5/12/9')
		expect(getElevationTileUrl(15, 5241, 12667)).toBe(
			'/api/map/elevation/15/5241/12667',
		)
		expect(
			getStreetRequest(
				{ south: 1, west: 2, north: 3, east: 4 },
				'not sent to gateway',
			).url,
		).toBe('/api/map/streets?south=1&west=2&north=3&east=4')
	})

	test('only accepts same-origin gateway paths', () => {
		expect(() => configureMapImportGateway('https://example.com/api/map')).toThrow(
			/same-origin path/,
		)
		expect(() => configureMapImportGateway('//example.com/api/map')).toThrow(
			/same-origin path/,
		)
	})
})
