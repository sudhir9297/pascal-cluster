import { mirrorProjection } from './geometry'
import { createMirrorPlanMove } from './move-session'
import {type FloorplanMoveTarget,type FloorplanGeometry,type GeometryContext,type AnyNodeId} from '@pascal-app/core'
import {isGridSnapActive,useEditor} from '@pascal-app/editor'
import {mirrorPlanPose} from './placement'
import type {MirrorNode} from './schema'
export function mirrorFloorplan(n: MirrorNode, ctx: GeometryContext): FloorplanGeometry | null {
  const wall = ctx.resolve((n.wallId ?? n.parentId) as AnyNodeId)
  if(wall?.type !== 'wall') return null
  const p = mirrorPlanPose(n,wall), c = Math.cos(p.yaw), s = Math.sin(p.yaw)
  const depth = mirrorProjection(n)
  const footprint: FloorplanGeometry = {kind:'polygon',points:[[-n.width/2,0],[n.width/2,0],[n.width/2,depth],[-n.width/2,depth]].map(([x,z])=>[p.x+x!*c+z!*s,p.z-x!*s+z!*c] as [number,number]),fill:'#eeeae3',stroke:ctx.viewState?.selected ? '#8b5cf6' : '#737373',strokeWidth:0.006}
  const point = (x: number, z: number): [number,number] => [p.x+x*c+z*s,p.z-x*s+z*c]
  const start = point(-n.width/2,depth/2), end = point(n.width/2,depth/2)
  return {kind:'group',children:[footprint,{kind:'line',x1:start[0],y1:start[1],x2:end[0],y2:end[1],stroke:'transparent',strokeWidth:12,vectorEffect:'non-scaling-stroke',pointerEvents:'stroke',cursor:'move'}]}
}
export const mirrorFloorplanMove: FloorplanMoveTarget<MirrorNode> = args => createMirrorPlanMove({...args, gridStep:()=>isGridSnapActive()?useEditor.getState().gridSnapStep:0})
