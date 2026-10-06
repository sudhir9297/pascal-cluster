import type { NodeDefinition } from '@pascal-app/core'
import { WallLightNode, WALL_LIGHT } from './schema'
import { buildWallLightGeometry, wallLightGeometryKey } from './geometry'
import { wallLightFloorplan, wallLightFloorplanMove } from './floorplan'
import { wallLightPaint, wallLightFinishLabels as labels } from './finishes'
export const wallLightDefinition: NodeDefinition<typeof WallLightNode> = {
  kind: WALL_LIGHT, schema: WallLightNode, schemaVersion: 1, category: 'furnish', snapProfile: 'item',
  defaults: () => { const { id,type,...rest } = WallLightNode.parse({name:'Bathroom light'}); return rest },
  geometry: buildWallLightGeometry, geometryKey: wallLightGeometryKey, drafting: {surfaceQuery:true},
  parametrics: {groups:[],customPanel:()=>import('./inspector')},
  floorplan: wallLightFloorplan, floorplanMoveTarget: wallLightFloorplanMove,
  system: {module:()=>import('./system'),priority:3}, tool:()=>import('./tool'),
  affordanceTools: {move:()=>import('./tool')},
  capabilities: {
    selectable:{hitVolume:'bbox'},deletable:true,
    movable:{axes:['x','y'],gridSnap:true,directDrag:true}, duplicable:{subtree:'with-children'},
    wallOpeningPlacement:true,hostRefFields:['wallId'],
    paint:wallLightPaint,
    slots:()=>Object.entries(labels).map(([slotId,label])=>({slotId,label,default:'#393c40'})),
  },
  presentation:{label:'Bathroom light',description:'Wall-mounted bathroom bar light with adjustable visual brightness.',icon:{kind:'iconify',name:'lucide:lamp-wall-up'},paletteSection:'furnish',paletteOrder:226},
  toolHints:[{key:'Left click',label:'Place on wall'},{key:'Esc',label:'Exit placement'}],
}
