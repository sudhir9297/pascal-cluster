import { getCatalogMaterialById, parseMaterialRef, type AnyNode, type SceneMaterial } from '@pascal-app/core'
import { MirrorNode } from '../mirror/schema'
import { mirrorPlacement } from '../mirror/placement'
import { TowelRailNode } from '../towel-rail/schema'
import { towelRailPlacement } from '../towel-rail/placement'
import { WallLightNode } from '../wall-light/schema'
import { wallLightPlacement } from '../wall-light/placement'
import { fixtureInventory, type FixtureRow } from './inventory'

export type BathroomIssue = { id: string; fixture: FixtureRow; message: string }

/** Authored attachment/material checks. No invented regulatory clearance thresholds. */
export function bathroomDesignReview(nodes: Readonly<Record<string, AnyNode>>, materials: Readonly<Record<string, SceneMaterial>> = {}): BathroomIssue[] {
  const issues: BathroomIssue[] = []
  for (const fixture of fixtureInventory(nodes, materials)) {
    const node = nodes[fixture.id]!
    const raw = node as unknown as Record<string, unknown>
    const add = (code: string, message: string) => issues.push({ id: `${node.id}:${code}`, fixture, message })
    const wallId = typeof raw.wallId === 'string' ? raw.wallId : null
    const accessory = String(node.type) === 'bath-space:mirror' || String(node.type) === 'bath-space:towel-rail' || String(node.type) === 'bath-space:wall-light'
    const host = nodes[wallId ?? (accessory ? node.parentId ?? '' : '')]
    if ((wallId || accessory) && host?.type !== 'wall') {
      add('wall', 'Supporting wall is missing. Reattach this fixture to a wall.')
    } else if (host?.type === 'wall' && accessory) {
      const parsed = String(node.type) === 'bath-space:mirror' ? MirrorNode.safeParse(node) : String(node.type) === 'bath-space:wall-light' ? WallLightNode.safeParse(node) : TowelRailNode.safeParse(node)
      if (!parsed.success) add('parameters', 'Fixture parameters are invalid. Review its dimensions and mounting.')
      else {
        const n = parsed.data
        const geometryHost = { ...host, visible: true }
        const fit = n.type === 'bath-space:mirror'
          ? mirrorPlacement(n, geometryHost, n.position[0], n.side, 0, false, nodes)
          : n.type === 'bath-space:wall-light' ? wallLightPlacement(n, geometryHost, n.position[0], n.side, 0, false, nodes)
          : towelRailPlacement(n, geometryHost, n.position[0], n.side, 0, false, nodes)
        const length = Math.hypot(host.end[0] - host.start[0], host.end[1] - host.start[1])
        // Placement clamps a proposed station. Review must also detect saved end overhangs.
        if (!fit || n.position[0] < n.width / 2 - 1e-6 || n.position[0] > length - n.width / 2 + 1e-6)
          add('fit', 'Fixture extends beyond its supporting wall. Adjust its width, height or position.')
      }
    }
    const slots = raw.slots && typeof raw.slots === 'object' && !Array.isArray(raw.slots) ? raw.slots as Record<string, unknown> : {}
    for (const [slot, ref] of Object.entries(slots)) {
      if (typeof ref !== 'string' || !ref) continue
      const parsed = parseMaterialRef(ref)
      const resolved = parsed?.kind === 'scene' ? materials[parsed.id] : parsed?.kind === 'library' ? getCatalogMaterialById(parsed.id) : null
      if (!resolved) add(`finish:${slot}`, `${slot.replaceAll('-', ' ')} finish is unavailable. Choose a replacement or reset to its default.`)
    }
  }
  return issues
}
