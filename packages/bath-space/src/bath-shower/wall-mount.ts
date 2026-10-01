import {
  collectLevelWallSegments,
  getEffectiveNode,
  getWallBaseElevationForNodes,
  getWallEffectiveHeightForNodes,
  isCurvedWall,
  type AnyNode,
  type AnyNodeId,
} from '@pascal-app/core'
import { bathLevelNode } from '../bath-deck/attachment'
import { type BathtubNode } from '../bathtub/schema'
export type BathEndWallMount = {
  wallId: string
  side: 'front' | 'back'
  station: number
  position: [number, number, number]
  rotation: number
}
/** Resolve a real end wall, on the face toward the bathing well, in bath coordinates. */
export function bathEndWallMount(
  bath: BathtubNode,
  end: 'left' | 'right',
  point: [number, number, number],
  height: number,
  nodes: Readonly<Record<string, AnyNode>>,
  wallId?: string | null,
  backOffset = 0.045,
): BathEndWallMount | null {
  const world = bathLevelNode(bath, nodes),
    c = Math.cos(world.rotation),
    s = Math.sin(world.rotation),
    sign = end === 'left' ? -1 : 1
  const px = world.position[0] + point[0] * c + point[2] * s,
    pz = world.position[2] - point[0] * s + point[2] * c
  const ex = world.position[0] + ((sign * bath.length) / 2) * c,
    ez = world.position[2] - ((sign * bath.length) / 2) * s
  let best: { distance: number; mount: BathEndWallMount } | null = null
  const effectiveNodes = { ...nodes }
  for (const raw of Object.values(nodes))
    if (raw.type === 'wall' && raw.parentId === world.parentId)
      effectiveNodes[raw.id] = getEffectiveNode(raw)
  for (const segment of collectLevelWallSegments(
    effectiveNodes as Record<AnyNodeId, AnyNode>,
    world.parentId as AnyNodeId,
  )) {
    const wall = getEffectiveNode(segment.wall)
    if ((wallId && wall.id !== wallId) || wall.visible === false || isCurvedWall(wall)) continue
    // A short-end wall is perpendicular to the bath length, not its long rear side.
    if (Math.abs(segment.dirX * c - segment.dirY * s) > 0.000001) continue
    const nx = -segment.dirY,
      nz = segment.dirX,
      centrePerp =
        (world.position[0] - segment.start[0]) * nx + (world.position[2] - segment.start[1]) * nz,
      faceSign = centrePerp >= 0 ? 1 : -1,
      face = (faceSign * (wall.thickness ?? 0.1)) / 2
    const endPerp = (ex - segment.start[0]) * nx + (ez - segment.start[1]) * nz
    const gap = (endPerp - face) * faceSign
    if (gap < -0.002 || gap > 0.025) continue
    const station = (px - segment.start[0]) * segment.dirX + (pz - segment.start[1]) * segment.dirY
    if (station < 0.045 || station > segment.length - 0.045) continue
    const wallHeight =
      getWallBaseElevationForNodes(wall, nodes) + getWallEffectiveHeightForNodes(wall, nodes)
    if (world.position[1] + point[1] + height > wallHeight + 0.001) continue
    // The fixture back lands on the wall face; screen hinges extend 45 mm behind the pivot.
    const perp = (px - segment.start[0]) * nx + (pz - segment.start[1]) * nz,
      shift = face + faceSign * backOffset - perp
    const dx = px + nx * shift - world.position[0],
      dz = pz + nz * shift - world.position[2]
    const mount: BathEndWallMount = {
      wallId: wall.id,
      side: faceSign > 0 ? 'front' : 'back',
      station,
      position: [dx * c - dz * s, point[1], dx * s + dz * c],
      rotation: 0,
    }
    if (!best || gap < best.distance) best = { distance: gap, mount }
  }
  return best?.mount ?? null
}
