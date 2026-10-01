import type { AnyNode, HandleDescriptor } from '@pascal-app/core'
import { tapDimensions } from './geometry'
import type { TapNode } from './schema'

const mm = (value: number) => Math.round(value*1000)/1000
export function tapHandles(node: TapNode): HandleDescriptor<TapNode>[] {
  const dimensions=tapDimensions(node), wall = dimensions.mount === 'wall'
  const diameterFactor=dimensions.design==='plate' ? .052/.024 : 1
  const handles: HandleDescriptor<TapNode>[] = [
    { kind: 'linear-resize', axis: 'y', anchor: wall ? 'center' : 'min', min: .12, max: .6,
      currentValue: tap => tapDimensions(tap).height,
      apply: (_tap, height) => ({ height: mm(height) }),
      placement: { position: tap => { const p=tapDimensions(tap); return [-.09,p.design==='plate' ? p.height/2+.08 : p.design==='mixer' ? p.height*.4+.11 : p.height+.1,0] } } },
    { kind: 'linear-resize', axis: 'z', anchor: 'max', direction: -1, min: .1, max: .3,
      currentValue: tap => tapDimensions(tap).reach,
      apply: (_tap, reach) => ({ reach: mm(reach) }),
      placement: { position: tap => [0,wall ? .07 : tapDimensions(tap).height*.73,-tapDimensions(tap).reach-.1] } },
    { kind: 'linear-resize', axis: dimensions.design==='mixer' ? 'y' : 'x', anchor: 'center', min: .024*diameterFactor, max: .08*diameterFactor, faceNormal: wall,
      currentValue: tap => tapDimensions(tap).bodyRadius*2*diameterFactor,
      apply: (_tap, diameter) => ({ bodyRadius: Math.round(diameter/(2*diameterFactor)*1000)/1000 }),
      placement: { position: tap => { const p=tapDimensions(tap); return p.design==='mixer' ? [-p.wallSpacing/2-.05,-p.bodyRadius-.1,-.06] : [p.bodyRadius*diameterFactor+.1,wall ? -.03 : p.height*.3,.02] } } },
  ]
  handles.push({
    kind: 'tap-action', shape: 'move-cross', plane: 'horizontal', cursor: 'move',
    onActivate: (tap, _scene, editor) => editor.engageMoveDrag(tap as unknown as AnyNode),
    placement: { position: () => [-.18,0,-.06] },
  })
  return handles
}
