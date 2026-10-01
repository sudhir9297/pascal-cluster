import {
  SiteNode,
  BuildingNode,
  LevelNode,
  WallNode,
  SlabNode,
  type AnyNode,
} from '@pascal-app/core'
import {
  FloorStandingToiletNode,
  toiletPresets,
} from '../src/floor-standing-toilet/schema'
import { toiletPlacement } from '../src/floor-standing-toilet/placement'
import { defaultToiletControl } from '../src/flush-control/attachment'

const site = SiteNode.parse({ name: 'Coupled toilet studies' })
const building = BuildingNode.parse({
  name: 'Toilet showroom',
  parentId: site.id,
})
const level = LevelNode.parse({
  name: 'Two-piece and one-piece models',
  parentId: building.id,
  height: 2.8,
})
const floor = SlabNode.parse({
  name: 'Showroom floor',
  parentId: level.id,
  elevation: 0,
  thickness: 0.05,
  polygon: [
    [-3, -2.3],
    [3, -2.3],
    [3, 4],
    [-3, 4],
  ],
})
const nodes: Record<string, AnyNode> = Object.fromEntries(
  [site, building, level, floor].map((n) => [n.id, n]),
)
site.children = [building.id]
building.children = [level.id]
level.children = [floor.id]
for (const [row, prefix] of ['two-piece', 'one-piece-'].entries()) {
  const z = row === 0 ? -2 : 1
  const wall = WallNode.parse({
    name: row === 0 ? 'Two-piece display' : 'One-piece display',
    parentId: level.id,
    start: [-2.5, z],
    end: [2.5, z],
    height: 1.1,
    thickness: 0.12,
  })
  nodes[wall.id] = wall
  level.children.push(wall.id)
  const presets = toiletPresets.filter((p) => p.design.startsWith(prefix))
  for (const [column, preset] of presets.entries()) {
    const raw = FloorStandingToiletNode.parse({ ...preset, name: preset.label })
    const toilet = FloorStandingToiletNode.parse({
      ...raw,
      ...toiletPlacement(raw, wall, 0.65 + column * 1.2, 'front'),
    })
    const control = defaultToiletControl(toilet, nodes)!
    toilet.children = [control.id]
    wall.children.push(toilet.id)
    nodes[toilet.id] = toilet as unknown as AnyNode
    nodes[control.id] = control as unknown as AnyNode
  }
}
const graph = {
  nodes,
  rootNodeIds: [site.id],
  collections: {},
  materials: {},
  installedPlugins: ['pascal:bath-space'],
}
await Bun.write(
  new URL(
    '../docs/references/coupled-toilets/showcase.scene.json',
    import.meta.url,
  ),
  JSON.stringify(graph, null, 2),
)
const response = await fetch('http://localhost:3002/api/scenes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Bath Space — two-piece and one-piece toilet showroom',
    graph,
  }),
})
const result = await response.json()
if (!response.ok)
  throw new Error(
    `Scene creation failed (${response.status}): ${JSON.stringify(result)}`,
  )
console.log(JSON.stringify({ scene: result, models: 8 }, null, 2))
