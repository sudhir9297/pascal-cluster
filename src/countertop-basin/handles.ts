import type { HandleDescriptor, SceneApi } from '@pascal-app/core'
import { basinDepth, isInsetBasinKind, SEMI_RECESSED_BASIN, type BasinNode } from './schema'
import { basinDetachPatch, basinEditSupportPatch } from './attachment'

const millimetres = (value: number) => Math.round(value * 1000) / 1000
function edit<N extends BasinNode>(node: N, patch: Partial<N>, scene: SceneApi): Partial<N> {
  const next = { ...node, ...patch, ...basinEditSupportPatch(node, { ...node, ...patch }, scene.nodes()) }
  return { ...patch, position: next.position, ...basinDetachPatch(next, scene.nodes()) } as Partial<N>
}

export function basinHandles<N extends BasinNode>(node: N): HandleDescriptor<N>[] {
  const inset = isInsetBasinKind(node.type) && node.type !== SEMI_RECESSED_BASIN
  const arrowY = (basin: N) => inset ? 0.08 : basin.height - (basin.type === SEMI_RECESSED_BASIN ? basin.recessDepth : 0) + 0.08
  const handles: HandleDescriptor<N>[] = [
    {
      kind: 'linear-resize', axis: 'x', anchor: 'center', min: 0.3, max: 0.8,
      currentValue: basin => basin.width,
      apply: (basin, width, scene) => edit(basin, { width: millimetres(width) } as Partial<N>, scene),
      placement: { position: basin => [basin.width / 2 + 0.18, arrowY(basin), 0] },
    },
    {
      kind: 'linear-resize', axis: 'y', anchor: inset ? 'max' : 'min', direction: inset ? -1 : 1, min: node.type === SEMI_RECESSED_BASIN ? 0.12 : 0.08, max: 0.22,
      currentValue: basin => basin.height,
      apply: (basin, height, scene) => edit(basin, { height: millimetres(height) } as Partial<N>, scene),
      placement: { position: basin => inset ? [basin.width / 2 + 0.18, -basin.height - 0.12, 0] : [0, basin.height + 0.22, 0] },
    },
    {
      kind: 'arc-resize', axis: 'angular', shape: 'rotate',
      apply: (basin, delta, scene) => edit(basin, { rotation: basin.rotation - delta } as Partial<N>, scene),
      placement: {
        position: basin => [basin.width / 2 + 0.22, arrowY(basin), basinDepth(basin) / 2 + 0.22],
        rotationY: () => -Math.PI / 4,
      },
    },
  ]
  // A round bowl has one diameter; exposing a separate depth would do nothing.
  if (node.shape !== 'round') handles.splice(1, 0, {
    kind: 'linear-resize', axis: 'z', anchor: 'center', min: 0.3, max: 0.55,
    currentValue: basin => basin.depth,
    apply: (basin, depth, scene) => edit(basin, { depth: millimetres(depth) } as Partial<N>, scene),
    placement: { position: basin => [0, arrowY(basin), basin.depth / 2 + 0.18] },
  })
  return handles
}
