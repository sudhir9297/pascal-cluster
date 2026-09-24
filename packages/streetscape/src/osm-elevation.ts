import { getElevationTileUrl } from './map-data-source'

export type GeoPoint = { lat: number; lon: number }

export type GeoBoundingBox = {
	south: number
	west: number
	north: number
	east: number
}

export const TERRAIN_TILE_ZOOM = 15
const TERRAIN_TILE_SIZE = 256

export type TerrainTile = {
	width: number
	height: number
	elevations: Float32Array
}

export type TerrainTileLoader = (
	zoom: number,
	x: number,
	y: number,
	signal?: AbortSignal,
) => Promise<TerrainTile | null>

export function terrariumTileUrl(zoom: number, x: number, y: number): string {
	return getElevationTileUrl(zoom, x, y)
}

/** Continuous slippy-map tile coordinates (integer part = tile index). */
export function latLonToTileFraction(
	point: GeoPoint,
	zoom: number,
): { x: number; y: number } {
	const scale = 2 ** zoom
	const latRad = (point.lat * Math.PI) / 180
	return {
		x: ((point.lon + 180) / 360) * scale,
		y:
			((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
			scale,
	}
}

/** Terrarium RGB encoding: elevation = (R * 256 + G + B / 256) - 32768. */
export function decodeTerrariumPixels(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
): Float32Array {
	const elevations = new Float32Array(width * height)
	for (let index = 0; index < width * height; index++) {
		const offset = index * 4
		elevations[index] =
			rgba[offset]! * 256 + rgba[offset + 1]! + rgba[offset + 2]! / 256 - 32768
	}
	return elevations
}

async function fetchTerrariumTile(
	zoom: number,
	x: number,
	y: number,
	signal?: AbortSignal,
): Promise<TerrainTile | null> {
	try {
		const response = await fetch(terrariumTileUrl(zoom, x, y), { signal })
		if (!response.ok) return null
		const bitmap = await createImageBitmap(await response.blob())
		const canvas =
			typeof OffscreenCanvas !== 'undefined'
				? new OffscreenCanvas(bitmap.width, bitmap.height)
				: Object.assign(document.createElement('canvas'), {
						width: bitmap.width,
						height: bitmap.height,
					})
		const context = canvas.getContext('2d') as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null
		if (!context) return null
		context.drawImage(bitmap, 0, 0)
		const image = context.getImageData(0, 0, bitmap.width, bitmap.height)
		return {
			width: bitmap.width,
			height: bitmap.height,
			elevations: decodeTerrariumPixels(image.data, bitmap.width, bitmap.height),
		}
	} catch (error) {
		if (signal?.aborted) throw error
		return null
	}
}

/**
 * Samples ground elevation from Mapzen/AWS terrarium DEM tiles. Prefetch the
 * covering tile set once, then sample synchronously with bilinear filtering.
 * Sampling is clamped within each tile; at 600 m scale the seam error between
 * adjacent tiles is negligible.
 */
export class TerrainSampler {
	private tiles = new Map<string, TerrainTile | null>()
	failedTiles = 0

	constructor(
		private zoom: number = TERRAIN_TILE_ZOOM,
		private loadTile: TerrainTileLoader = fetchTerrariumTile,
	) {}

	get successfulTiles(): number {
		return [...this.tiles.values()].filter((tile) => tile !== null).length
	}

	hasElevationAt(point: GeoPoint): boolean {
		const fraction = latLonToTileFraction(point, this.zoom)
		return Boolean(this.tiles.get(`${Math.floor(fraction.x)}/${Math.floor(fraction.y)}`))
	}

	async prefetch(bbox: GeoBoundingBox, signal?: AbortSignal): Promise<void> {
		signal?.throwIfAborted()
		const min = latLonToTileFraction({ lat: bbox.north, lon: bbox.west }, this.zoom)
		const max = latLonToTileFraction({ lat: bbox.south, lon: bbox.east }, this.zoom)
		const jobs: Promise<void>[] = []
		for (let x = Math.floor(min.x); x <= Math.floor(max.x); x++) {
			for (let y = Math.floor(min.y); y <= Math.floor(max.y); y++) {
				const key = `${x}/${y}`
				if (this.tiles.has(key)) continue
				jobs.push(
					this.loadTile(this.zoom, x, y, signal).then((tile) => {
						this.tiles.set(key, tile)
						if (!tile) this.failedTiles += 1
					}),
				)
			}
		}
		await Promise.all(jobs)
		signal?.throwIfAborted()
	}

	/** Elevation in metres, or 0 where the covering tile failed to load. */
	elevationAt(point: GeoPoint): number {
		const fraction = latLonToTileFraction(point, this.zoom)
		const tileX = Math.floor(fraction.x)
		const tileY = Math.floor(fraction.y)
		const tile = this.tiles.get(`${tileX}/${tileY}`)
		if (!tile) return 0
		const pixelX = (fraction.x - tileX) * tile.width - 0.5
		const pixelY = (fraction.y - tileY) * tile.height - 0.5
		const x0 = Math.max(0, Math.min(tile.width - 1, Math.floor(pixelX)))
		const y0 = Math.max(0, Math.min(tile.height - 1, Math.floor(pixelY)))
		const x1 = Math.min(tile.width - 1, x0 + 1)
		const y1 = Math.min(tile.height - 1, y0 + 1)
		const fx = Math.max(0, Math.min(1, pixelX - x0))
		const fy = Math.max(0, Math.min(1, pixelY - y0))
		const at = (x: number, y: number) => tile.elevations[y * tile.width + x]!
		const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx
		const bottom = at(x0, y1) * (1 - fx) + at(x1, y1) * fx
		return top * (1 - fy) + bottom * fy
	}
}

export { TERRAIN_TILE_SIZE }
