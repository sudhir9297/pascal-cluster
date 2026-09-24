import { describe, expect, test } from 'bun:test'
import {
	buildOsmPointAssets,
	countOsmPointAssets,
	mapOsmRoadSign,
	parseOsmPointFeatures,
} from './osm-point-assets'

describe('OSM point asset parsing', () => {
	test('reads lamps, traffic signals, and traffic signs from tagged nodes', () => {
		const features = parseOsmPointFeatures({
			elements: [
				{ type: 'node', id: 1, lat: 1, lon: 2, tags: { highway: 'street_lamp' } },
				{ type: 'node', id: 2, lat: 1, lon: 2, tags: { highway: 'traffic_signals' } },
				{ type: 'node', id: 3, lat: 1, lon: 2, tags: { traffic_sign: 'stop' } },
				{ type: 'node', id: 4, lat: 1, lon: 2, tags: { highway: 'give_way' } },
				{ type: 'node', id: 5, lat: 1, lon: 2, tags: { amenity: 'bench' } },
				{ type: 'way', id: 6, tags: { highway: 'street_lamp' } },
				{ type: 'node', id: 7, lat: Number.NaN, lon: 2, tags: { highway: 'street_lamp' } },
				{ type: 'node', id: 1, lat: 1, lon: 2, tags: { highway: 'street_lamp' } },
			],
		})

		expect(features.map(({ kind, sourceId }) => ({ kind, sourceId }))).toEqual([
			{ kind: 'street-lamp', sourceId: 'node/1' },
			{ kind: 'traffic-signal', sourceId: 'node/2' },
			{ kind: 'road-sign', sourceId: 'node/3' },
			{ kind: 'road-sign', sourceId: 'node/4' },
		])
	})

	test('maps supported sign semantics into the existing sign catalog', () => {
		expect(mapOsmRoadSign({ highway: 'stop' }).signId).toBe('stop')
		expect(mapOsmRoadSign({ traffic_sign: 'give_way' }).signId).toBe('yield')
		expect(mapOsmRoadSign({ traffic_sign: 'maxspeed', maxspeed: '40' })).toEqual({
			signId: 'speed-limit',
			text: '40',
		})
		expect(mapOsmRoadSign({ traffic_sign: 'no_entry' }).signId).toBe('no-entry')
		expect(mapOsmRoadSign({ traffic_sign: 'no_parking' }).signId).toBe('no-parking')
		expect(mapOsmRoadSign({ traffic_sign: 'pedestrian_crossing' }).signId).toBe(
			'pedestrian-crossing',
		)
		expect(mapOsmRoadSign({ traffic_sign: 'direction', destination: 'Centre' })).toEqual({
			signId: 'directional',
			text: 'Centre',
		})
		expect(mapOsmRoadSign({ traffic_sign: 'mystery_code' }).signId).toBe('warning')
	})
})

describe('OSM point asset assembly', () => {
	test('projects, elevates, orients, and clips mapped objects', () => {
		const features = parseOsmPointFeatures({
			elements: [
				{
					type: 'node',
					id: 1,
					lat: 0,
					lon: 0,
					tags: { direction: 'north', height: '20 ft', highway: 'street_lamp' },
				},
				{
					type: 'node',
					id: 2,
					lat: 0,
					lon: 0,
					tags: { highway: 'traffic_signals', 'traffic_signals:direction': '90' },
				},
				{
					type: 'node',
					id: 3,
					lat: 0,
					lon: 0,
					tags: { traffic_sign: 'stop' },
				},
				{ type: 'node', id: 4, lat: 0, lon: 0, tags: { highway: 'street_lamp' } },
			],
		})
		const assets = buildOsmPointAssets(
			features,
			(point) => (point === features[3]!.point ? [101, 0] : [10, 20]),
			100,
			(x, z) => x + z,
		)

		expect(assets).toHaveLength(3)
		expect(assets[0]).toMatchObject({
			height: 6.096,
			kind: 'street-lamp',
			position: [10, 30, 20],
			rotationY: Math.PI,
		})
		expect(assets[1]?.rotationY).toBeCloseTo(Math.PI / 2)
		expect(countOsmPointAssets(assets)).toEqual({
			roadSigns: 1,
			streetLamps: 1,
			trafficSignals: 1,
		})
	})
})
