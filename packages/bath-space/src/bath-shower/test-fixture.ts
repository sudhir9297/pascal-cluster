import {LevelNode,WallNode,type AnyNode,type AnyNodeId} from '@pascal-app/core'
import {BathtubNode} from '../bathtub/schema'
import {createBathShower} from './creation'
export function comboFixture(end:'left'|'right'='left',rotation=0){
 const level=LevelNode.parse({height:2.5}),bath=BathtubNode.parse({parentId:level.id,rotation}),c=Math.cos(rotation),s=Math.sin(rotation),x=(end==='left'?-1:1)*.9
 const point=(z:number):[number,number]=>[x*c+z*s,-x*s+z*c]
 const wall=WallNode.parse({parentId:level.id,start:point(-1),end:point(1),thickness:.1,height:2.5});level.children=[wall.id,bath.id as never]
 const nodes:Record<string,AnyNode>={[level.id]:level,[wall.id]:wall,[bath.id]:bath as unknown as AnyNode},result=createBathShower(bath,nodes,end)
 for(const item of result.changes.create)nodes[item.node.id]=item.node
 nodes[bath.id]={...bath,children:[result.node.id]} as unknown as AnyNode
 return {nodes,bath,wall,node:result.node}
}
