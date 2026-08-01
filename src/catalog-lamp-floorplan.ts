import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import {
  resolveCatalogLampProjection,
  type CatalogLampNode,
  type CatalogLampProjection,
} from './catalog-lamp-config'

type Point = readonly [number, number]

function rotated(point: Point, center: Point, angle: number): Point {
  const dx = point[0] - center[0]
  const dy = point[1] - center[1]
  return [center[0] + dx * Math.cos(angle) - dy * Math.sin(angle), center[1] + dx * Math.sin(angle) + dy * Math.cos(angle)]
}

function rect(center: Point, width: number, depth: number, angle: number, fill: string, stroke: string): FloorplanGeometry {
  const halfW = width / 2
  const halfD = depth / 2
  const points = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ].map(([x, y]) => rotated([center[0] + (x ?? 0), center[1] + (y ?? 0)], center, angle))
  return { kind: 'polygon', points, fill, fillOpacity: 0.78, stroke, strokeWidth: 0.035 }
}

export function buildCatalogLampFloorplan(node: CatalogLampNode, ctx: GeometryContext): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const center: Point = [x, z]
  const projection = resolveCatalogLampProjection(node.type as string, node.visualStyle) ?? 'shoebox'
  const angle = node.rotation?.[1] ?? 0
  const view = ctx.viewState
  const palette = view?.palette
  const selected = view?.selected ?? false
  const stroke = selected
    ? palette?.selectedStroke ?? '#2563eb'
    : view?.hovered
      ? palette?.wallHoverStroke ?? '#60a5fa'
      : node.poleColor ?? '#363b40'
  const lampFill = node.lightOn ? node.lightColor ?? '#ffd39a' : '#6b7280'
  const children: FloorplanGeometry[] = []

  if (projection === 'catenary') {
    const half = (node.armLength ?? 6) / 2
    children.push(
      { kind: 'line', x1: x - half, y1: z, x2: x + half, y2: z, stroke, strokeWidth: 0.055, strokeLinecap: 'round' },
      { kind: 'circle', cx: x, cy: z, r: 0.28, fill: lampFill, fillOpacity: 0.8, stroke, strokeWidth: 0.035 },
    )
  } else if (projection === 'wall-pack' || projection === 'wall-arm') {
    children.push(rect(center, projection === 'wall-pack' ? 0.32 : (node.armLength ?? 1.4) + 0.2, projection === 'wall-pack' ? 0.5 : 0.2, angle, lampFill, stroke))
  } else if (projection === 'bollard' || projection === 'path' || projection === 'globe') {
    children.push({ kind: 'circle', cx: x, cy: z, r: projection === 'bollard' ? 0.16 : 0.12, fill: lampFill, fillOpacity: 0.8, stroke, strokeWidth: 0.035 })
  } else if (projection === 'high-mast' || projection === 'candelabra') {
    const count = projection === 'high-mast' ? 6 : 3
    children.push({ kind: 'circle', cx: x, cy: z, r: 0.24, fill: node.poleColor ?? '#363b40', stroke, strokeWidth: 0.035 })
    for (let index = 0; index < count; index += 1) {
      const direction = angle + (index * Math.PI * 2) / count
      const end: Point = [x + Math.cos(direction) * (node.armLength ?? 1), z + Math.sin(direction) * (node.armLength ?? 1)]
      children.push(
        { kind: 'line', x1: x, y1: z, x2: end[0], y2: end[1], stroke, strokeWidth: 0.05, strokeLinecap: 'round' },
        { kind: 'circle', cx: end[0], cy: end[1], r: 0.18, fill: lampFill, fillOpacity: 0.78, stroke, strokeWidth: 0.035 },
      )
    }
  } else {
    const length = node.armLength ?? 1
    const end: Point = [x + Math.cos(angle) * length, z + Math.sin(angle) * length]
    children.push(
      { kind: 'circle', cx: x, cy: z, r: 0.2, fill: node.poleColor ?? '#363b40', stroke, strokeWidth: 0.035 },
      { kind: 'line', x1: x, y1: z, x2: end[0], y2: end[1], stroke, strokeWidth: 0.05, strokeLinecap: 'round' },
      rect(end, projection === 'tunnel' ? 1.2 : 0.62, projection === 'shoebox' ? 0.42 : 0.32, angle, lampFill, stroke),
    )
  }
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
