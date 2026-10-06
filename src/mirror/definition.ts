import type { NodeDefinition } from '@pascal-app/core'
import { MirrorNode, MIRROR } from './schema'
import { buildMirrorGeometry, mirrorGeometryKey } from './geometry'
import { mirrorFloorplan, mirrorFloorplanMove } from './floorplan'
import { mirrorHandles } from './handles'
import { mirrorPaint, mirrorFinishLabels as labels } from './finishes'
export const mirrorDefinition: NodeDefinition<typeof MirrorNode> = {
  kind: MIRROR, schema: MirrorNode, schemaVersion: 1, category: 'furnish', snapProfile: 'item',
  defaults: () => { const { id,type,...rest } = MirrorNode.parse({name:'Bathroom mirror'}); return rest },
  geometry: buildMirrorGeometry, geometryKey: mirrorGeometryKey, drafting: {surfaceQuery:true},
  handles: mirrorHandles,
  parametrics: {groups:[],customPanel:()=>import('./inspector')},
  floorplan: mirrorFloorplan, floorplanMoveTarget: mirrorFloorplanMove,
  system: {module:()=>import('./system'),priority:3}, tool:()=>import('./tool'),
  affordanceTools: {move:()=>import('./tool')},
  capabilities: {
    selectable:{hitVolume:'bbox'},deletable:true,
    movable:{axes:['x','y'],gridSnap:true,directDrag:true}, duplicable:{subtree:'with-children'},
    wallOpeningPlacement:true,hostRefFields:['wallId'],
    paint:mirrorPaint,
    slots:()=>Object.entries(labels).map(([slotId,label])=>({slotId,label,default:slotId==='frame'?'#393c40':slotId==='backing'?'#686b70':'#c9dbe0'})),
  },
  presentation:{label:'Bathroom mirror',description:'Wall-mounted shaped mirror with an optional frame and backlight.',icon:{kind:'iconify',name:'lucide:rectangle-vertical'},paletteSection:'furnish',paletteOrder:224},
  toolHints:[{key:'Left click',label:'Place on wall'},{key:'Esc',label:'Exit placement'}],
}
