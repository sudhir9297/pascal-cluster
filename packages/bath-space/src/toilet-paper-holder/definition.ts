import type {NodeDefinition} from '@pascal-app/core'
import {ToiletPaperHolderNode,TOILET_PAPER_HOLDER} from './schema'
import {buildHolderGeometry,holderGeometryKey} from './geometry'
import {holderFloorplan,holderFloorplanMove} from './floorplan'
import {createSlotPaint} from '../freestanding-vanity/paint'
const labels={metal:'Holder',paper:'Paper',core:'Cardboard core'}
export const toiletPaperHolderDefinition: NodeDefinition<typeof ToiletPaperHolderNode> = {
  kind:TOILET_PAPER_HOLDER,schema:ToiletPaperHolderNode,schemaVersion:1,category:'furnish',snapProfile:'item',
  defaults:()=>{const {id,type,...rest}=ToiletPaperHolderNode.parse({name:'Toilet paper holder'});return rest},
  geometry:buildHolderGeometry,geometryKey:holderGeometryKey,drafting:{surfaceQuery:true},
  parametrics:{groups:[],customPanel:()=>import('./inspector')},
  floorplan:holderFloorplan,floorplanMoveTarget:holderFloorplanMove,
  system:{module:()=>import('./system'),priority:3}, tool:()=>import('./tool'),affordanceTools:{move:()=>import('./tool')},
  capabilities:{selectable:{hitVolume:'bbox'},deletable:true,movable:{axes:['x','y'],gridSnap:true,directDrag:true},duplicable:{subtree:'with-children'},wallOpeningPlacement:true,hostRefFields:['wallId'],
    paint:createSlotPaint((v:unknown):v is keyof typeof labels=>typeof v==='string' && Object.hasOwn(labels,v),0.2),
    slots:()=>Object.entries(labels).map(([slotId,label])=>({slotId,label,default:slotId==='metal'?'#bbc3cb':slotId==='paper'?'#f4f1e9':'#ac9273'}))},
  presentation:{label:'Toilet paper holder',description:'Wall-mounted paper roll holder.',icon:{kind:'iconify',name:'lucide:toilet'},paletteSection:'furnish',paletteOrder:223},
  toolHints:[{key:'Left click',label:'Place on wall'},{key:'Esc',label:'Exit placement'}],
}
