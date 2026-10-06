import type { NodeDefinition } from '@pascal-app/core'
import { TowelRailNode, TOWEL_RAIL } from './schema'
import { buildTowelRailGeometry, towelRailGeometryKey } from './geometry'
import { towelRailFloorplan, towelRailFloorplanMove } from './floorplan'
import { towelRailPaint, towelRailFinishLabels as labels } from './finishes'
export const towelRailDefinition: NodeDefinition<typeof TowelRailNode> = {
  kind: TOWEL_RAIL, schema: TowelRailNode, schemaVersion: 1, category: 'furnish', snapProfile: 'item',
  defaults: () => { const { id,type,...rest } = TowelRailNode.parse({name:'Towel rail'}); return rest },
  geometry: buildTowelRailGeometry, geometryKey: towelRailGeometryKey, drafting: {surfaceQuery:true},
  parametrics: {groups:[],customPanel:()=>import('./inspector')},
  floorplan: towelRailFloorplan, floorplanMoveTarget: towelRailFloorplanMove,
  system: {module:()=>import('./system'),priority:3}, tool:()=>import('./tool'),
  affordanceTools: {move:()=>import('./tool')},
  capabilities: {
    selectable:{hitVolume:'bbox'},deletable:true,
    movable:{axes:['x','y'],gridSnap:true,directDrag:true}, duplicable:{subtree:'with-children'},
    wallOpeningPlacement:true,hostRefFields:['wallId'],
    paint:towelRailPaint,
    slots:()=>Object.entries(labels).map(([slotId,label])=>({slotId,label,default:'#bbc3cb'})),
  },
  presentation:{label:'Towel rail',description:'Wall-mounted single or double towel rail.',icon:{kind:'iconify',name:'lucide:stretch-horizontal'},paletteSection:'furnish',paletteOrder:225},
  toolHints:[{key:'Left click',label:'Place on wall'},{key:'Esc',label:'Exit placement'}],
}
