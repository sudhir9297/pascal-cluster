import {getEffectiveNode} from '@pascal-app/core'
import {BATH_SHOWER,BathShowerNode} from '../bath-shower/schema'
import {bathShowerMount} from '../bath-shower/mounting'
import {bathEndWallMount} from '../bath-shower/wall-mount'
import {Group} from 'three'
import type {AnyNode} from '@pascal-app/core'
import {BATHTUB,BathtubNode,bathRimWidth} from '../bathtub/schema'
import {bathDeckParent} from '../bath-deck/attachment'
import {attachmentChanges} from '../attachments/slots'
import {BathScreenNode,BATH_SCREEN} from './schema'
export function screenSide(screen:BathScreenNode,bath:BathtubNode) {return screen.side==='automatic'?(bath.shape==='walk-in'&&bath.doorSide==='left'?'right':'left'):screen.side}
export function bathScreenBasePose(screen:BathScreenNode,bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>={}) {
  const side=screenSide(screen,bath),deck=bathDeckParent(bath,nodes)
  return {position:[(side==='left'?-1:1)*(bath.length/2-0.015),bath.height+(bath.shape==='undermount'&&deck?deck.thickness+0.002:0),-bath.width/2+bathRimWidth(bath)-0.006] as [number,number,number],rotation:0,mirror:side==='left'?1:-1}
}
export function bathScreenWallMount(screen:BathScreenNode,bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>) {
  const pose=bathScreenBasePose(screen,bath,nodes)
  return bathEndWallMount(bath,screenSide(screen,bath),pose.position,screen.height,nodes,screen.wallId)
}
export function bathScreenPose(screen:BathScreenNode,bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>={}) {
  const base=bathScreenBasePose(screen,bath,nodes),wall=screen.mounting==='wall'?bathScreenWallMount(screen,bath,nodes):null
  return wall?{...base,position:wall.position}:base
}
export function createBathScreenTarget(bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>={}) {
  const target=new Group(),pose=bathScreenPose(BathScreenNode.parse({}),bath,nodes)
  target.name='bath-screen-target';target.position.fromArray(pose.position)
  target.userData={attachmentTarget:'bath-screen',hostId:bath.id,slotId:'screen',capacity:1}
  return target
}
export function attachBathScreen(screen:BathScreenNode,bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>,existingId?:string) {
  if(Object.values(nodes).some(raw=>raw.parentId===bath.id&&String(raw.type)===BATH_SHOWER))throw new Error('Edit the screen owned by the bath shower combination')
  if(bath.shape==='corner')throw new Error('A curved corner front needs a dedicated screen layout')
  const wall=bathScreenWallMount(screen,bath,nodes)
  if(screen.mounting==='wall'&&!wall)throw new Error('Screen requires a compatible bath-end wall with enough height')
  const mounted={...screen,mounting:wall?'wall' as const:screen.mounting,wallId:wall?.wallId??screen.wallId}
  const placed=BathScreenNode.parse({...mounted,parentId:bath.id,...bathScreenPose(mounted,bath,nodes)})
  return {placed,changes:attachmentChanges(placed as unknown as AnyNode,{hostId:bath.id,slotId:'screen',type:'bath-screen',capacity:1},'bath-screen',nodes,raw=>String(raw.type)===BATH_SCREEN?{hostId:raw.parentId??'',slotId:'screen'}:null,existingId)}
}

export function screenBath(screen:BathScreenNode,nodes:Readonly<Record<string,AnyNode>>){
 let raw=nodes[screen.parentId??''];if(raw&&String(raw.type)===BATH_SHOWER)raw=nodes[raw.parentId??''];return raw&&String(raw.type)===BATHTUB?BathtubNode.parse(getEffectiveNode(raw)):null
}
export function bathScreenParentPose(screen:BathScreenNode,bath:BathtubNode,nodes:Readonly<Record<string,AnyNode>>){
 const pose=bathScreenPose(screen,bath,nodes),raw=nodes[screen.parentId??''];if(!raw||String(raw.type)!==BATH_SHOWER)return pose
 const mount=bathShowerMount(BathShowerNode.parse(getEffectiveNode(raw)),nodes);if(!mount)return null
 const c=Math.cos(mount.rotation),s=Math.sin(mount.rotation),dx=pose.position[0]-mount.position[0],dz=pose.position[2]-mount.position[2]
 return {...pose,position:[dx*c-dz*s,pose.position[1]-mount.position[1],dx*s+dz*c] as [number,number,number],rotation:-mount.rotation}
}
