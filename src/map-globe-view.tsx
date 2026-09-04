'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
	clampMapZoom,
	GLOBE_FLAT_THRESHOLD_ZOOM,
	MAP_TILE_SIZE,
	MAX_MAP_ZOOM,
	metersPerPixel,
	MIN_MAP_ZOOM,
	osmTileUrl,
	tileOffsetFromCenter,
	tileFractionToLatLon,
} from './map-tiles'
import { type GeoPoint, latLonToTileFraction } from './osm-elevation'
import type { OsmStreetPreview, OsmStreetPreviewPath } from './osm-import'

const MAX_LAT = 85.05112878
const GLOBE_TEXTURE_ZOOM = 2
const FLAT_TILE_RADIUS = 2
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

const textureLoader = new THREE.TextureLoader()
textureLoader.setCrossOrigin('anonymous')

const tileTextureCache = new Map<string, THREE.Texture>()

function loadTileTexture(zoom: number, x: number, y: number): THREE.Texture {
	const key = `${zoom}/${x}/${y}`
	const cached = tileTextureCache.get(key)
	if (cached) return cached
	const texture = textureLoader.load(osmTileUrl(zoom, x, y))
	texture.colorSpace = THREE.SRGBColorSpace
	tileTextureCache.set(key, texture)
	return texture
}

let sharedGlobeTexture: THREE.CanvasTexture | null = null

/** Stitches the low-zoom OSM tiles into one Mercator texture for the sphere. */
function useGlobeTexture(): THREE.CanvasTexture | null {
	const [texture, setTexture] = useState(sharedGlobeTexture)
	useEffect(() => {
		if (sharedGlobeTexture) {
			setTexture(sharedGlobeTexture)
			return
		}
		const tiles = 2 ** GLOBE_TEXTURE_ZOOM
		const size = 256
		const canvas = document.createElement('canvas')
		canvas.width = tiles * size
		canvas.height = tiles * size
		const context = canvas.getContext('2d')
		if (!context) return
		context.fillStyle = '#0b1a2b'
		context.fillRect(0, 0, canvas.width, canvas.height)
		const texture = new THREE.CanvasTexture(canvas)
		texture.colorSpace = THREE.SRGBColorSpace
		sharedGlobeTexture = texture
		setTexture(texture)
		for (let x = 0; x < tiles; x++) {
			for (let y = 0; y < tiles; y++) {
				const image = new Image()
				image.crossOrigin = 'anonymous'
				image.onload = () => {
					context.drawImage(image, x * size, y * size, size, size)
					texture.needsUpdate = true
				}
				image.src = osmTileUrl(GLOBE_TEXTURE_ZOOM, x, y)
			}
		}
	}, [])
	return texture
}

function globeOpacity(zoom: number): number {
	return THREE.MathUtils.clamp(GLOBE_FLAT_THRESHOLD_ZOOM - zoom, 0, 1)
}

function flatOpacity(zoom: number): number {
	return THREE.MathUtils.clamp(zoom - (GLOBE_FLAT_THRESHOLD_ZOOM - 1), 0, 1)
}

function Globe({ center, zoom }: { center: GeoPoint; zoom: number }) {
	const texture = useGlobeTexture()
	const meshRef = useRef<THREE.Mesh>(null)
	const materialRef = useRef<THREE.MeshBasicMaterial>(null)
	useFrame(() => {
		if (meshRef.current) {
			meshRef.current.rotation.y = -THREE.MathUtils.degToRad(center.lon) - Math.PI / 2
			meshRef.current.rotation.x = THREE.MathUtils.degToRad(center.lat)
		}
		if (materialRef.current) materialRef.current.opacity = globeOpacity(zoom)
	})
	if (globeOpacity(zoom) <= 0) return null
	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[1, 64, 64]} />
			<meshBasicMaterial
				ref={materialRef}
				map={texture ?? undefined}
				color={texture ? '#ffffff' : '#1d4ed8'}
				transparent
			/>
		</mesh>
	)
}

function FlatMap({ center, zoom }: { center: GeoPoint; zoom: number }) {
	const tileZoom = Math.round(clampMapZoom(zoom))
	const fraction = latLonToTileFraction(center, tileZoom)
	const scale = 2 ** tileZoom
	const opacity = flatOpacity(zoom)
	if (opacity <= 0) return null
	const quads: Array<{ key: string; x: number; y: number; texture: THREE.Texture }> = []
	const centerX = Math.floor(fraction.x)
	const centerY = Math.floor(fraction.y)
	for (let dx = -FLAT_TILE_RADIUS; dx <= FLAT_TILE_RADIUS; dx++) {
		for (let dy = -FLAT_TILE_RADIUS; dy <= FLAT_TILE_RADIUS; dy++) {
			const tileX = centerX + dx
			const tileY = centerY + dy
			if (tileY < 0 || tileY >= scale) continue
			const wrappedX = ((tileX % scale) + scale) % scale
			quads.push({
				key: `${tileX}:${tileY}`,
				x: tileX + 0.5 - fraction.x,
				y: -(tileY + 0.5 - fraction.y),
				texture: loadTileTexture(tileZoom, wrappedX, tileY),
			})
		}
	}
	return (
		<group>
			{quads.map((quad) => (
				<mesh key={quad.key} position={[quad.x, quad.y, 0]}>
					<planeGeometry args={[1, 1]} />
					<meshBasicMaterial map={quad.texture} transparent opacity={opacity} />
				</mesh>
			))}
		</group>
	)
}

function CameraRig({ zoom }: { zoom: number }) {
	const { camera } = useThree()
	useFrame(() => {
		const target =
			zoom >= GLOBE_FLAT_THRESHOLD_ZOOM
				? 3.2
				: THREE.MathUtils.mapLinear(THREE.MathUtils.clamp(zoom, 1, 5), 1, 5, 3.6, 2.4)
		camera.position.z = THREE.MathUtils.lerp(camera.position.z, target, 0.2)
		camera.position.x = 0
		camera.position.y = 0
		camera.lookAt(0, 0, 0)
	})
	return null
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
	const dragRef = useRef<{ x: number; y: number } | null>(null)
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

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (disabled) return
		dragRef.current = { x: event.clientX, y: event.clientY }
		event.currentTarget.setPointerCapture(event.pointerId)
	}

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (disabled) return
		const start = dragRef.current
		if (!start) return
		const dx = event.clientX - start.x
		const dy = event.clientY - start.y
		dragRef.current = { x: event.clientX, y: event.clientY }
		const height = containerRef.current?.clientHeight ?? 200

		if (zoom < GLOBE_FLAT_THRESHOLD_ZOOM) {
			const degPerPixel = 90 / height
			const lon = center.lon - dx * degPerPixel
			const lat = THREE.MathUtils.clamp(center.lat + dy * degPerPixel, -MAX_LAT, MAX_LAT)
			onCenterChange({ lat, lon: ((lon + 540) % 360) - 180 })
			return
		}

		const tileZoom = Math.round(clampMapZoom(zoom))
		const fraction = latLonToTileFraction(center, tileZoom)
		const tilesPerPixel = TILES_PER_VIEW / height
		const next = tileFractionToLatLon(
			fraction.x - dx * tilesPerPixel,
			fraction.y - dy * tilesPerPixel,
			tileZoom,
		)
		onCenterChange({
			lat: THREE.MathUtils.clamp(next.lat, -MAX_LAT, MAX_LAT),
			lon: ((next.lon + 540) % 360) - 180,
		})
	}

	const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
		dragRef.current = null
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
	}

	const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
		if (disabled) return
		onZoomChange(clampMapZoom(zoom - event.deltaY * 0.004))
	}

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

	useEffect(() => {
		const node = containerRef.current
		if (!node) return
		const onWheelNative = (event: WheelEvent) => event.preventDefault()
		node.addEventListener('wheel', onWheelNative, { passive: false })
		return () => node.removeEventListener('wheel', onWheelNative)
	}, [])

	return (
		<div
			aria-label="Interactive globe and street map. Drag to move and use the mouse wheel to zoom."
			aria-disabled={disabled}
			className={`relative h-48 w-full overflow-hidden rounded-lg border border-border bg-[#0b1a2b] ${disabled ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'} ${className}`}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onWheel={handleWheel}
			ref={containerRef}
			style={{ touchAction: 'none' }}
		>
			<Canvas camera={{ position: [0, 0, 3.2], fov: 50 }} dpr={[1, 2]}>
				<ambientLight intensity={1} />
				<CameraRig zoom={zoom} />
				<Globe center={center} zoom={zoom} />
				<FlatMap center={center} zoom={zoom} />
			</Canvas>
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
					© OpenStreetMap contributors
				</a>{' '}
				· z{zoom.toFixed(1)}
			</div>
		</div>
	)
}

export { MIN_MAP_ZOOM, MAX_MAP_ZOOM }
