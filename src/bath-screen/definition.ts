import {useScene,type AnyNodeId,type NodeDefinition} from '@pascal-app/core'
import {createSlotPaint} from '../freestanding-vanity/paint'
import {BathScreenNode,BATH_SCREEN} from './schema'
import {buildBathScreenGeometry} from './geometry'
import {bathScreenParentPose,screenBath,bathScreenPose,bathScreenWallMount} from './attachment'
import {bathLevelNode} from '../bath-deck/attachment'
import {BathtubNode,BATHTUB} from '../bathtub/schema'
const labels={glass:'Screen glass',hardware:'Hinges and frame',seal:'Bottom seal'}
export const bathScreenDefinition:NodeDefinition<typeof BathScreenNode>={
  kind:BATH_SCREEN,schemaVersion:1,schema:BathScreenNode,category:'furnish',
  defaults:()=>{const {id,type,...rest}=BathScreenNode.parse({name:'Bath screen'});return rest},geometry:buildBathScreenGeometry,geometryKey:node=>JSON.stringify(node),
  system:{module:()=>import('./system'),priority:3},
  capabilities:{selectable:{hitVolume:'bbox'},selectionHighlight:false,deletable:true,hostRefFields:['wallId'],paint:createSlotPaint((slot):slot is keyof typeof labels=>typeof slot==='string'&&Object.hasOwn(labels,slot),0.1),slots:()=>Object.entries(labels).map(([slotId,label])=>({slotId,label,default:slotId==='glass'?'#d9f3fa':'#c0c0c0'}))},
  keyboardActions:{e:{appliesTo:node=>String(node.type)===BATH_SCREEN,run:raw=>{const n=BathScreenNode.parse(raw);useScene.getState().updateNode(n.id as AnyNodeId,{opening:n.opening!==0?0:90} as never)}}},
  parametrics:{groups:[],customPanel:()=>import('./inspector')},
  floorplanDependencies:(node,nodes)=>{const ids:AnyNodeId[]=[];let id=node.parentId;while(id&&!ids.includes(id as AnyNodeId)){ids.push(id as AnyNodeId);id=nodes[id as AnyNodeId]?.parentId??null}if(node.wallId&&!ids.includes(node.wallId as AnyNodeId))ids.push(node.wallId as AnyNodeId);return ids},
  floorplan:(node,ctx)=>{
    const nodes=ctx.sceneNodes??{},bath=screenBath(node,nodes);if(!bath||!bathScreenParentPose(node,bath,nodes))return null;if(node.mounting==='wall'&&!bathScreenWallMount(node,bath,nodes))return null;const pose=bathScreenPose(node,bath,nodes),world=bathLevelNode(bath,nodes),angle=node.opening*Math.PI/180
    const points=[[pose.position[0],pose.position[2]],[pose.position[0]+pose.mirror*node.width*Math.cos(angle),pose.position[2]-node.width*Math.sin(angle)]]
    const c=Math.cos(world.rotation),s=Math.sin(world.rotation)
    return {kind:'polygon',points:points.map(([x,z])=>[world.position[0]+x!*c+z!*s,world.position[2]-x!*s+z!*c] as [number,number]),fill:'none',stroke:ctx.viewState?.selected?'#8b5cf6':'#8bd0e0',strokeWidth:0.012}
  },
  presentation:{label:'Bath screen',description:'Independent hinged glass panel attached to a bath.',icon:{kind:'iconify',name:'lucide:panel-right'}},
}
