'use client'
import {getEffectiveNode,sceneRegistry,type AnyNodeId,type SceneApi} from '@pascal-app/core'
import {useFrame} from '@react-three/fiber'
import {BathtubNode,BATHTUB} from '../bathtub/schema'
import {screenBath,bathScreenParentPose,bathScreenWallMount} from './attachment'
import {BathScreenNode,BATH_SCREEN} from './schema'
export default function BathScreenSystem({sceneApi}:{sceneApi:SceneApi}) {
  useFrame(()=>{const nodes=sceneApi.nodes();for(const id of sceneRegistry.byType[BATH_SCREEN]??[]) {
    const raw=nodes[id as AnyNodeId],root=sceneRegistry.nodes.get(id);if(!raw||!root)continue
    const node=BathScreenNode.parse(getEffectiveNode(raw)),bath=screenBath(node,nodes);if(!bath)continue
    root.visible=node.visible!==false&&(node.mounting!=='wall'||Boolean(bathScreenWallMount(node,bath,nodes)));const pose=bathScreenParentPose(node,bath,nodes);if(!pose){root.visible=false;continue}root.position.fromArray(pose.position);root.rotation.y=pose.rotation;root.scale.x=pose.mirror
  }},3)
  return null
}
