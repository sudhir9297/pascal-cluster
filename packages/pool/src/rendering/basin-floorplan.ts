import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { ShapeUtils, Vector2 } from 'three'
import { createPoolAssemblyPlan } from '../core/pool-assembly-plan'
import type { PoolNode, PoolPoint } from '../core/schema'
import { clipAtX, getCrossSectionIntervals, sampleBoundaryBench } from '../design/feature-layout'
import { outsetPoolPolygon } from '../design/outlines'
import { planPath, poolPlanPoint } from './plan-frame'

export function poolBasinFloorplan(node: PoolNode, ctx?: GeometryContext): FloorplanGeometry[] {
  const { inner, outlines, depth } = createPoolAssemblyPlan(node)
  const project = (p: readonly [number, number]) => poolPlanPoint(node, p, ctx)
  const children: FloorplanGeometry[] = [
    { kind: 'path', d: planPath(outlines.copingOuter.map(project)), fill: node.copingColor,
      stroke: '#64748b', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' },
    { kind: 'path', d: planPath(inner.map(project)), fill: node.waterColor, fillOpacity: 0.55,
      stroke: '#0e7490', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' },
  ]
  const detailLine = (a: PoolPoint, b: PoolPoint, dashed = false) => {
    const [x1, y1] = project(a), [x2, y2] = project(b)
    children.push({ kind: 'line', x1, y1, x2, y2, stroke: '#0e7490', strokeWidth: 1,
      ...(dashed ? { strokeDasharray: '4 3' } : {}), vectorEffect: 'non-scaling-stroke', pointerEvents: 'none' })
  }
  const section = (x: number, dashed = false) => {
    for (const [minZ, maxZ] of getCrossSectionIntervals(inner, x)) detailLine([x, minZ], [x, maxZ], dashed)
  }
  const fill = (points: PoolPoint[]) => {
    if (points.length < 3) return
    children.push({ kind: 'path', d: planPath(points.map(project)), fill: '#e0f2fe',
      fillOpacity: 0.7, stroke: 'none', pointerEvents: 'none' })
  }
  if (node.entryFeature !== 'none') {
    const length = Math.min(node.entryLength, (depth.maximumX - depth.minimumX) * 0.6)
    const endX = depth.minimumX + length
    const triangles = ShapeUtils.triangulateShape(inner.map(([x, z]) => new Vector2(x, z)), [])
    for (const indices of triangles) {
      const triangle = indices.map(index => inner[index]!)
      fill(clipAtX(clipAtX(triangle, depth.minimumX, true), endX, false))
    }
    const steps = node.entryFeature === 'steps' ? Math.max(2, Math.min(6, Math.round(node.stepCount))) : 1
    for (let index = 1; index <= steps; index++) section(depth.minimumX + length * index / steps)
    if (node.entryFeature === 'beach-entry') {
      const z = getCrossSectionIntervals(inner, depth.minimumX + length / 2)[0]
      if (z) detailLine([depth.minimumX + length * 0.2, (z[0] + z[1]) / 2], [depth.minimumX + length * 0.8, (z[0] + z[1]) / 2], true)
    }
  }
  if (node.benchEnabled) {
    const width = Math.min(node.benchWidth, Math.min(node.length, node.width) * 0.3)
    if (node.benchStyle === 'perimeter') {
      const inset = outsetPoolPolygon(inner, -Math.max(0.05, width))
      for (let index = 0; index < inner.length; index++) {
        const next = (index + 1) % inner.length
        fill([inner[index]!, inner[next]!, inset[next]!, inset[index]!])
        detailLine(inset[index]!, inset[next]!)
      }
    } else {
      const samples = sampleBoundaryBench(inner, node.benchBoundaryT, node.benchLength, width)
      fill([...samples.map(sample => sample.point), ...samples.map(sample => sample.inner).reverse()])
      for (let index = 1; index < samples.length; index++) detailLine(samples[index - 1]!.inner, samples[index]!.inner)
      for (const sample of [samples[0]!, samples.at(-1)!]) detailLine(sample.point, sample.inner)
    }
  }
  if (depth.profile.kind === 'shallow-to-deep') {
    const span = depth.maximumX - depth.minimumX
    section(depth.minimumX + span * depth.profile.slopeStart / 100, true)
    section(depth.minimumX + span * depth.profile.slopeEnd / 100, true)
    const x = depth.minimumX + span / 2
    const interval = getCrossSectionIntervals(inner, x).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0]
    if (interval) {
      const [px, py] = project([x, (interval[0] + interval[1]) / 2])
      children.push({ kind: 'text', x: px, y: py, text: `${depth.profile.shallowDepth.toFixed(2)} → ${depth.profile.deepDepth.toFixed(2)} m`,
        fill: '#0e7490', fontSize: 0.18, textAnchor: 'middle', dominantBaseline: 'middle', upright: true })
    }
  }
  return children
}
