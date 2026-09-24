import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { currentPathway, isNaturalStoneFinish, type PathwayNode } from '../domain/schema'
import { pathTerminalEnds } from '../domain/terminals'
import { buildOutline } from './outline'
import { pavingJoints, polygonsToPath } from './plan-finish'
import { laidPavingTiles } from './laid-paving'
import { pavingBorder } from './paving-border'
import { naturalStones } from './natural-stones'

function stoneShade(color: string, index: number, amount: number): string {
  const delta = (index - 1.5) * amount * 12
  const channels = [1, 3, 5].map((start) => Math.max(0, Math.min(255,
    Math.round(Number.parseInt(color.slice(start, start + 2), 16) + delta))))
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function buildPathwayFloorplan(
  node: PathwayNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  node = currentPathway(node)
  const selected = ctx.viewState?.selected || ctx.viewState?.highlighted
  const outline = buildOutline(node)
  const paving: FloorplanGeometry = {
    kind: 'path',
    d: polygonsToPath(outline),
    fill: node.color,
    fillRule: 'evenodd',
    stroke: selected
      ? (ctx.viewState?.palette?.selectedStroke ?? '#f97316')
      : '#837b6c',
    strokeWidth: selected ? 0.045 : 0.018,
  }
  const joints = pavingJoints(outline, node.finish ?? 'concrete')
  const natural = isNaturalStoneFinish(node.finish)
  const open = node.finish === 'laidStone' || natural
  const surface: FloorplanGeometry[] = open ? [] : [paving]
  const tiles = natural
    ? naturalStones(node).map((stone) => ({ ...stone, border: false }))
    : laidPavingTiles(node)
  if (node.finish === 'laidStone' || natural) surface.push(...tiles.map(({ ring, holes, border, shade }): FloorplanGeometry => ({
    kind: 'path', d: [ring, ...(holes ?? [])].map((r) => `M ${r.map(([x, z]) => `${x} ${z}`).join(' L ')} Z`).join(' '), fillRule: 'evenodd',
    fill: border ? '#9a9d88' : natural
      ? stoneShade(node.color, shade, node.naturalStoneShade ?? 0.4)
      : ['#adb09d', '#b6b8a5', '#bcbcab', '#aeb3a1'][shade]!,
    stroke: '#848977', strokeWidth: 0.004,
  })))
  else if (tiles.length) surface.push({ kind: 'path',
    d: tiles.map(({ ring }) => `M ${ring.map(([x, z]) => `${x} ${z}`).join(' L ')} Z`).join(' '),
    fill: 'none', stroke: '#989889', strokeWidth: 0.018 })
  if (node.borderStyle === 'smooth' || (node.borderStyle === 'stone' && node.finish !== 'laidStone')) {
    const edging = pavingBorder(outline, Math.min(0.13, ...node.edges.map((edge) => edge.width * 0.18)))
    const edgePolygons = node.borderStyle === 'smooth'
      ? edging.band
      : edging.stones
    surface.push(...edgePolygons.map((polygon): FloorplanGeometry => ({
      kind: 'path',
      d: polygon.map((ring) => `M ${ring.map(([x, z]) => `${x} ${z}`).join(' L ')} Z`).join(' '),
      fill: node.borderStyle === 'smooth' ? '#b8b9a8' : '#c8c8b9',
      fillRule: 'evenodd',
      stroke: node.borderStyle === 'smooth' ? '#9c9e8d' : '#9b9b8b',
      strokeWidth: node.borderStyle === 'smooth' ? 0.012 : 0.009,
    })))
  }
  if (joints) surface.push({ kind: 'path', d: joints, fill: '#332820', fillOpacity: 0.28, fillRule: 'evenodd' })
  if (!ctx.viewState?.selected) return surface.length === 1 ? surface[0]! : { kind: 'group', children: surface }
  return {
    kind: 'group',
    children: [
      ...surface,
      ...pathTerminalEnds(node).map((terminal): FloorplanGeometry => ({
        kind: 'move-arrow',
        point: [terminal.point[0] + terminal.direction[0] * 0.55,
          terminal.point[1] + terminal.direction[1] * 0.55],
        angle: terminal.angle,
        affordance: 'pathway-extend-endpoint',
        payload: { vertexId: terminal.vertexId },
      })),
      ...node.vertices.map((vertex): FloorplanGeometry => ({
        kind: 'endpoint-handle',
        point: vertex.point,
        state: 'idle',
        variant: 'endpoint',
        affordance: 'pathway-move-junction',
        payload: { vertexId: vertex.id },
      })),
      ...node.vertices.map((v, i): FloorplanGeometry => ({
        kind: 'text',
        x: v.point[0],
        y: v.point[1] - 0.38,
        text: `J${i + 1}`,
        fontSize: 0.22,
        fill: '#fff',
        stroke: '#344939',
        strokeWidth: 0.05,
        paintOrder: 'stroke',
        textAnchor: 'middle',
        dominantBaseline: 'central',
        upright: true,
      })),
    ],
  }
}
