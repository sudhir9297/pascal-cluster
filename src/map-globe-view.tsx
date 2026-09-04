'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as MapLibreGL from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
	clampMapZoom,
	GLOBE_FLAT_THRESHOLD_ZOOM,
	MAP_TILE_SIZE,
	MAX_MAP_ZOOM,
	metersPerPixel,
	MIN_MAP_ZOOM,
	tileOffsetFromCenter,
} from './map-tiles'
import { type GeoPoint } from './osm-elevation'
import type { OsmStreetPreview, OsmStreetPreviewPath } from './osm-import'

const MAX_LAT = 85.05112878
/** Approximate number of tiles spanning the canvas height, for pan scaling. */
const TILES_PER_VIEW = 3

const PREVIEW_STYLE_BY_CLASS: Record<
	OsmStreetPreviewPath['roadClass'],
	{ color: string; width: number }
> = {
	alley: { color: '#94a3b8', width: 2 },
	highway: { color: '#fb7185', width: 4.5 },
	arterial: { color: '#fb923c', width: 4 },
	collector: { color: '#facc15', width: 3.5 },
	local: { color: '#38bdf8', width: 3 },
	service: { color: '#cbd5e1', width: 2.25 },
}

const OBJECT_COLOR = {
	'road-sign': '#60a5fa',
	'street-lamp': '#fde047',
	'traffic-signal': '#f87171',
} as const

const MAPCN_STYLE = 'https://tiles.openfreemap.org/styles/bright'

function forceEnglishLabels(map: MapLibreGL.Map) {
	for (const layer of map.getStyle().layers) {
		if (layer.type !== 'symbol' || !layer.layout?.['text-field']) continue
		map.setLayoutProperty(layer.id, 'text-field', [
			'coalesce',
			['get', 'name:en'],
			['get', 'name_en'],
			['get', 'name:latin'],
		])
	}
}

/** MapCN's core pattern: MapLibre owns the camera and its native interaction loop. */
function MapCnGlobe({
	center,
	disabled,
	onCenterChange,
	onZoomChange,
	zoom,
}: {
	center: GeoPoint
	disabled: boolean
	onCenterChange: (center: GeoPoint) => void
	onZoomChange: (zoom: number) => void
	zoom: number
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<MapLibreGL.Map | null>(null)
	const projectionRef = useRef<'globe' | 'mercator' | null>(null)
	const onCenterChangeRef = useRef(onCenterChange)
	const onZoomChangeRef = useRef(onZoomChange)
	onCenterChangeRef.current = onCenterChange
	onZoomChangeRef.current = onZoomChange

	useEffect(() => {
		if (!containerRef.current || mapRef.current) return
		if (!MapLibreGL.getWorkerUrl()) {
			MapLibreGL.setWorkerUrl(
				`https://unpkg.com/maplibre-gl@${MapLibreGL.getVersion()}/dist/maplibre-gl-worker.mjs`,
			)
		}
		const map = new MapLibreGL.Map({
			attributionControl: false,
			center: [center.lon, center.lat],
			container: containerRef.current,
			fadeDuration: 0,
			interactive: true,
			maxPitch: 0,
			dragRotate: false,
			pitchWithRotate: false,
			renderWorldCopies: false,
			touchPitch: false,
			style: MAPCN_STYLE,
			zoom,
		})
		if (disabled) {
			map.dragPan.disable()
			map.scrollZoom.disable()
			map.touchZoomRotate.disable()
		}
		map.doubleClickZoom.disable()
		map.boxZoom.disable()
		map.once('load', () => {
			forceEnglishLabels(map)
			const projection = map.getZoom() < GLOBE_FLAT_THRESHOLD_ZOOM ? 'globe' : 'mercator'
			map.setProjection({ type: projection })
			projectionRef.current = projection
		})
		map.on('moveend', () => {
			const nextCenter = map.getCenter()
			onCenterChangeRef.current({
				lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, nextCenter.lat)),
				lon: ((nextCenter.lng + 540) % 360) - 180,
			})
			onZoomChangeRef.current(clampMapZoom(map.getZoom()))
		})
		mapRef.current = map
		const resizeObserver = new ResizeObserver(() => map.resize())
		resizeObserver.observe(containerRef.current)
		map.resize()
		return () => {
			resizeObserver.disconnect()
			map.remove()
			mapRef.current = null
			projectionRef.current = null
		}
	}, [])

	useEffect(() => {
		const map = mapRef.current
		if (!map) return
		if (disabled) {
			map.dragPan.disable()
			map.scrollZoom.disable()
			map.touchZoomRotate.disable()
		} else {
			map.dragPan.enable()
			map.scrollZoom.enable()
			map.touchZoomRotate.enable()
		}
		map.doubleClickZoom.disable()
		map.boxZoom.disable()
	}, [disabled])

	useEffect(() => {
		const map = mapRef.current
		if (!map || !map.isStyleLoaded()) return
		const currentCenter = map.getCenter()
		const centerChanged =
			Math.abs(currentCenter.lat - center.lat) > 0.00001 ||
			Math.abs(currentCenter.lng - center.lon) > 0.00001
		const zoomChanged = Math.abs(map.getZoom() - zoom) > 0.001
		if (centerChanged || zoomChanged) map.jumpTo({ center: [center.lon, center.lat], zoom })
		const projection = zoom < GLOBE_FLAT_THRESHOLD_ZOOM ? 'globe' : 'mercator'
		if (projectionRef.current !== projection) {
			map.setProjection({ type: projection })
			projectionRef.current = projection
		}
	}, [center.lat, center.lon, zoom])

	return (
		<div
			aria-hidden
			className="absolute inset-0 bg-white transition-opacity duration-300"
			style={{ pointerEvents: 'auto' }}
		>
			<div className="h-full w-full" ref={containerRef} />
		</div>
	)
}

export type MapGlobeViewProps = {
	center: GeoPoint
	className?: string
	disabled?: boolean
	radiusMeters: number
	zoom: number
	onCenterChange: (center: GeoPoint) => void
	onZoomChange: (zoom: number) => void
	streetPreview?: OsmStreetPreview | null
}

export function MapGlobeView({
	center,
	className = '',
	disabled = false,
	radiusMeters,
	zoom,
	onCenterChange,
	onZoomChange,
	streetPreview = null,
}: MapGlobeViewProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [containerSize, setContainerSize] = useState({ height: 0, width: 0 })

	useEffect(() => {
		const node = containerRef.current
		if (!node) return
		const updateSize = () =>
			setContainerSize({ height: node.clientHeight, width: node.clientWidth })
		updateSize()
		const observer = new ResizeObserver(updateSize)
		observer.observe(node)
		return () => observer.disconnect()
	}, [])
	const selectionRadiusPixels =
		zoom >= GLOBE_FLAT_THRESHOLD_ZOOM && containerSize.height > 0
			? (radiusMeters / metersPerPixel(center.lat, Math.round(zoom))) *
				(containerSize.height / (MAP_TILE_SIZE * TILES_PER_VIEW))
			: 0
	const showSelectionRadius = selectionRadiusPixels >= 3
	const previewPaths = useMemo(() => {
		if (
			!streetPreview ||
			zoom < GLOBE_FLAT_THRESHOLD_ZOOM ||
			containerSize.height <= 0
		) {
			return []
		}
		const tileZoom = Math.round(clampMapZoom(zoom))
		const pixelsPerTile = containerSize.height / TILES_PER_VIEW
		const paths = new Map<OsmStreetPreviewPath['roadClass'], string[]>()
		for (const path of streetPreview.paths) {
			const points = path.points.map((point) => {
				const offset = tileOffsetFromCenter(point, center, tileZoom)
				return {
					x: containerSize.width / 2 + offset.x * pixelsPerTile,
					y: containerSize.height / 2 + offset.y * pixelsPerTile,
				}
			})
			if (points.length < 2) continue
			const commands = points.map(
				(point, index) =>
					`${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
			)
			const entries = paths.get(path.roadClass) ?? []
			entries.push(commands.join(''))
			paths.set(path.roadClass, entries)
		}
		return [...paths].map(([roadClass, entries]) => ({
			d: entries.join(''),
			roadClass,
		}))
	}, [center, containerSize, streetPreview, zoom])
	const previewObjects = useMemo(() => {
		if (
			!streetPreview ||
			zoom < GLOBE_FLAT_THRESHOLD_ZOOM ||
			containerSize.height <= 0
		) {
			return []
		}
		const tileZoom = Math.round(clampMapZoom(zoom))
		const pixelsPerTile = containerSize.height / TILES_PER_VIEW
		return streetPreview.mappedObjects.map((object) => {
			const offset = tileOffsetFromCenter(object.point, center, tileZoom)
			return {
				...object,
				x: containerSize.width / 2 + offset.x * pixelsPerTile,
				y: containerSize.height / 2 + offset.y * pixelsPerTile,
			}
		})
	}, [center, containerSize, streetPreview, zoom])

	return (
		<div
			aria-label="Interactive globe and street map. Drag to move and use the mouse wheel to zoom."
			aria-disabled={disabled}
			className={`relative h-48 w-full overflow-hidden rounded-lg border border-border bg-[#0b1a2b] ${disabled ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'} ${className}`}
			ref={containerRef}
			style={{ touchAction: 'pan-x pan-y' }}
		>
			<MapCnGlobe
				center={center}
				disabled={disabled}
				onCenterChange={onCenterChange}
				onZoomChange={onZoomChange}
				zoom={zoom}
			/>
			{(previewPaths.length > 0 || previewObjects.length > 0) && (
				<svg
					aria-hidden
					className="pointer-events-none absolute inset-0 h-full w-full"
					viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
				>
					{previewPaths.map(({ d, roadClass }) => {
						const style = PREVIEW_STYLE_BY_CLASS[roadClass]
						return (
							<path
								d={d}
								fill="none"
								key={roadClass}
								stroke={style.color}
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={style.width}
								style={{ filter: 'drop-shadow(0 0 2px rgb(0 0 0 / 0.8))' }}
							/>
						)
					})}
					{previewObjects.map((object) => (
						<circle
							cx={object.x}
							cy={object.y}
							fill={OBJECT_COLOR[object.kind]}
							key={object.sourceId}
							r={4}
							stroke="rgba(15,23,42,0.9)"
							strokeWidth={1.5}
						/>
					))}
				</svg>
			)}
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
				{showSelectionRadius && (
					<div
						className="absolute rounded-full border-2 border-sky-300/90 bg-sky-300/10 shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_0_24px_rgba(125,211,252,0.18)]"
						style={{
							height: selectionRadiusPixels * 2,
							width: selectionRadiusPixels * 2,
						}}
					/>
				)}
				<div className="relative h-4 w-4 rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" />
			</div>
			{zoom >= GLOBE_FLAT_THRESHOLD_ZOOM && !showSelectionRadius && (
				<div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/45 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
					Zoom in to see the {radiusMeters} m import area
				</div>
			)}
			<div className="pointer-events-none absolute top-2 left-2 rounded bg-black/45 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
				Drag to move · Scroll to zoom
			</div>
			<div className="absolute right-2 bottom-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/75">
				<a
					className="underline-offset-2 hover:underline"
					href="https://www.openstreetmap.org/copyright"
					onPointerDown={(event) => event.stopPropagation()}
					rel="noreferrer"
					target="_blank"
				>
					© OpenStreetMap contributors © CARTO
				</a>{' '}
				· z{zoom.toFixed(1)}
			</div>
		</div>
	)
}

export { MIN_MAP_ZOOM, MAX_MAP_ZOOM }
