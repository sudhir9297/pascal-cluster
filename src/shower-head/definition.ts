import type { NodeDefinition,AnyNodeId } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { ShowerHeadNode,SHOWER_HEAD } from './schema'
import { buildShowerHeadGeometry,showerHeadGeometryKey } from './geometry'
import { showerHeadFloorplan } from './floorplan'
const labels={body:'Head body',face:'Spray face',nozzles:'Nozzles',connector:'Connector'}
const isSlot=(v:unknown):v is keyof typeof labels=>typeof v==='string'&&Object.hasOwn(labels,v)
export const showerHeadDefinition:NodeDefinition<typeof ShowerHeadNode>={
  kind:SHOWER_HEAD,schemaVersion:1,schema:ShowerHeadNode,category:'furnish',
  defaults:()=>{const {id,type,...rest}=ShowerHeadNode.parse({name:'Shower head'});return rest},
  geometry:buildShowerHeadGeometry,geometryKey:showerHeadGeometryKey,
  tool:()=>import('./tool'),affordanceTools:{move:()=>import('./tool')},
  floorplan:showerHeadFloorplan,floorplanDependencies:(n,nodes)=>{const ids:AnyNodeId[]=[];let id=n.parentId;while(id&&!ids.includes(id as AnyNodeId)){ids.push(id as AnyNodeId);id=nodes[id as AnyNodeId]?.parentId??null}return ids},floorplanDependsOnSiblings:true,
  capabilities:{selectable:{hitVolume:'bbox'},deletable:true,paint:createSlotPaint(isSlot,.22),slots:()=>Object.entries(labels).map(([slotId,label])=>({slotId,label,default:'#ffffff'}))},
  parametrics:{groups:[],customPanel:()=>import('./inspector')},
  presentation:{label:'Shower head',description:'Round, square, rectangular and classic heads attached to a shower arm.',icon:{kind:'iconify',name:'lucide:shower-head'}},
  toolHints:[{key:'Left click',label:'Attach or replace head on shower arm'},{key:'Esc',label:'Cancel'}],
}
