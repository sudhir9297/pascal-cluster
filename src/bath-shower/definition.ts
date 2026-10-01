import {ShowerAssemblyNode,SHOWER_ASSEMBLY} from '../shower-assembly/schema'
import {type NodeDefinition,type AnyNode,type AnyNodeId} from '@pascal-app/core'
import {BathShowerNode,BATH_SHOWER,bathShowerAssembly} from './schema'
import {bathShowerMount,bathShowerBath} from './mounting'
import {showerAssemblyDefinition} from '../shower-assembly/definition'
import {buildShowerAssemblyGeometry,showerAssemblyGeometryKey} from '../shower-assembly/geometry'
import {bathTapLocalToLevel} from '../bathtub/targets'
export const bathShowerDefinition:NodeDefinition<typeof BathShowerNode>={
 kind:BATH_SHOWER,schemaVersion:1,schema:BathShowerNode,category:'furnish',
 defaults:()=>{const {id,type,...rest}=BathShowerNode.parse({name:'Bath shower combination'});return rest},
 geometry:(n,ctx)=>buildShowerAssemblyGeometry(bathShowerAssembly(n),ctx),geometryKey:n=>showerAssemblyGeometryKey(bathShowerAssembly(n)),
 capabilities:{selectable:{hitVolume:'bbox'},deletable:true,hostRefFields:['wallId'],paint:showerAssemblyDefinition.capabilities.paint,slots:n=>{const slotProvider=showerAssemblyDefinition.capabilities.slots;return slotProvider?slotProvider(ShowerAssemblyNode.parse({...n,type:SHOWER_ASSEMBLY,id:undefined}) as unknown as AnyNode):[]}},
 parametrics:{groups:[],customPanel:()=>import('./inspector')},system:{module:()=>import('./system'),priority:2},
 floorplanDependencies:(n,nodes)=>{const ids:AnyNodeId[]=[];let id=n.parentId;while(id&&!ids.includes(id as AnyNodeId)){ids.push(id as AnyNodeId);id=nodes[id as AnyNodeId]?.parentId??null}if(n.wallId)ids.push(n.wallId as AnyNodeId);return ids},
 floorplanDependsOnSiblings:true,
 floorplan:(n,ctx)=>{const nodes=ctx.sceneNodes??{},pose=bathShowerMount(n,nodes),bath=bathShowerBath(n,nodes);if(!pose||!bath)return null;const world=bathTapLocalToLevel(bath,pose,nodes),c=Math.cos(world.rotation),s=Math.sin(world.rotation),half=Math.max(n.width/2,0.15),depth=n.projection+n.armLength;return {kind:'polygon',points:[[-half,0],[half,0],[half,depth],[-half,depth]].map(([x,z])=>[world.position[0]+x!*c+z!*s,world.position[2]-x!*s+z!*c] as [number,number]),fill:'#ffffff',stroke:'#737373',strokeWidth:0.008}},
 presentation:{label:'Bath shower combination',description:'Bath-linked shower fittings with separate head, handset, hose and screen.',icon:{kind:'iconify',name:'lucide:shower-head'}},
}
