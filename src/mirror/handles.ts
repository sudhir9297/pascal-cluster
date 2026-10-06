import { type AnyNodeId, type HandleDescriptor, type SceneApi } from '@pascal-app/core'
import { MirrorNode } from './schema'
import { mirrorPlacement } from './placement'
import { mirrorProjection } from './geometry'
export function mirrorEdit(node: MirrorNode, patch: Partial<MirrorNode>, scene: Pick<SceneApi,'nodes'>): Partial<MirrorNode> {
  const next = MirrorNode.parse({...node,...patch})
  const nodes = scene.nodes(), wall = nodes[(next.wallId??next.parentId) as AnyNodeId]
  const placement = wall?.type==='wall' ? mirrorPlacement(next,wall,next.position[0],next.side,0,false,nodes) : null
  if (wall?.type==='wall' && !placement) return {}
  return {...patch,height:next.height,...placement}
}
export function mirrorHandles(node: MirrorNode): HandleDescriptor<MirrorNode>[] {
  const edit = (n: MirrorNode, key: keyof MirrorNode, value: number, scene: SceneApi) => mirrorEdit(n,{[key]:Math.round(value*1000)/1000},scene)
  const handles: HandleDescriptor<MirrorNode>[] = [
    {kind:'linear-resize',axis:'x',anchor:'center',min:.3,max:2.4,currentValue:n=>n.width,apply:(n,v,s)=>edit(n,'width',v,s),placement:{position:n=>[n.width/2+.18,0,mirrorProjection(n)+.08]}},
    {kind:'linear-resize',axis:'z',anchor:'min',min:.01,max:.08,currentValue:n=>n.depth,apply:(n,v,s)=>edit(n,'depth',v,s),placement:{position:n=>[n.width/2+.18,-n.height/2,mirrorProjection(n)+.18]}},
    {kind:'linear-resize',axis:'y',anchor:'center',min:0,max:5,currentValue:n=>n.mountingHeight,apply:(n,v,s)=>edit(n,'mountingHeight',v,s),placement:{position:n=>[-n.width/2-.2,0,mirrorProjection(n)+.08]}},
  ]
  if (node.shape!=='round') handles.splice(1,0,{kind:'linear-resize',axis:'y',anchor:'center',min:.3,max:2.4,currentValue:n=>n.height,apply:(n,v,s)=>edit(n,'height',v,s),placement:{position:n=>[0,n.height/2+.18,mirrorProjection(n)+.08]}})
  if (node.frameEnabled) handles.push({kind:'linear-resize',axis:'x',anchor:'min',min:0,max:.08,currentValue:n=>n.frameWidth,apply:(n,v,s)=>edit(n,'frameWidth',v,s),placement:{position:n=>[n.width/2-n.frameWidth,n.height/2+.12,mirrorProjection(n)+.08]}})
  return handles
}
