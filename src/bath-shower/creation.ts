import {SHOWER_HOSE,ShowerHoseNode} from '../shower-hose/schema'
import {type AnyNode,type AnyNodeId} from '@pascal-app/core'
import {type BathtubNode} from '../bathtub/schema'
import {BathScreenNode,BATH_SCREEN} from '../bath-screen/schema'
import {bathScreenWallMount} from '../bath-screen/attachment'
import {createAssemblyChanges} from '../shower-assembly/children'
import {BathShowerNode,BATH_SHOWER,bathShowerAssembly} from './schema'
import {bathShowerMount} from './mounting'
export function createBathShower(bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>,end:'left'|'right'='left',withScreen=true) {
 let node=BathShowerNode.parse({parentId:bath.id,end,name:'Bath shower combination'})
 const pose=bathShowerMount(node,nodes);if(!pose)throw new Error('Bath shower requires a compatible end wall and head clearance')
 node=BathShowerNode.parse({...node,...pose,parentId:bath.id})
 const changes=createAssemblyChanges(bathShowerAssembly(node))
 for(const item of changes.create)if(String(item.node.type)===SHOWER_HOSE)item.node=ShowerHoseNode.parse({...item.node,targetId:null,followHostHandset:true}) as unknown as AnyNode
 const created=BathShowerNode.parse(changes.create[0]!.node)
 if(withScreen){
  const screen=BathScreenNode.parse({parentId:created.id,name:'Bath shower screen',side:end,mounting:'wall',wallId:pose.wallId})
  if(!bathScreenWallMount(screen,bath,nodes))throw new Error('The screen needs more wall height')
  changes.create[0]!.node={...created,children:[...created.children,screen.id]} as unknown as AnyNode
  changes.create.push({node:screen as unknown as AnyNode,parentId:created.id as AnyNodeId})
 }
 return {node:BathShowerNode.parse(changes.create[0]!.node),changes:{...changes,delete:Object.values(nodes).filter(raw=>raw.parentId===bath.id&&(String(raw.type)===BATH_SHOWER||(withScreen&&String(raw.type)===BATH_SCREEN))).map(raw=>raw.id)}}
}
