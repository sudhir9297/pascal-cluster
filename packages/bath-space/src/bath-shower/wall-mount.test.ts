import {expect,test} from 'bun:test'
import {LevelNode,WallNode,type AnyNode} from '@pascal-app/core'
import {BathtubNode} from '../bathtub/schema'
import {BathScreenNode} from '../bath-screen/schema'
import {attachBathScreen,bathScreenBasePose,bathScreenWallMount} from '../bath-screen/attachment'
import {BathDeckNode} from '../bath-deck/schema'
import {bathLevelNode} from '../bath-deck/attachment'
function fixture(rotation:number,end:'left'|'right',reverse=false,decked=false){
 const level=LevelNode.parse({height:2.5}),deck=BathDeckNode.parse({parentId:level.id,position:[3,0,4],rotation,height:0.65}),bath=BathtubNode.parse({shape:decked?'undermount':'rectangle',parentId:decked?deck.id:level.id,position:decked?[0,0,0]:[3,0,4],rotation:decked?0:rotation})
 const nodes:Record<string,AnyNode>={[level.id]:level,[bath.id]:bath as unknown as AnyNode,...(decked?{[deck.id]:deck as unknown as AnyNode}:{})},world=bathLevelNode(bath,nodes),x=(end==='left'?-1:1)*(bath.length/2+0.05),c=Math.cos(rotation),s=Math.sin(rotation)
 const transform=(z:number):[number,number]=>[world.position[0]+x*c+z*s,world.position[2]-x*s+z*c]
 const wall=WallNode.parse({parentId:level.id,start:transform(reverse?2:-2),end:transform(reverse?-2:2),thickness:0.1,height:2.5});nodes[wall.id]=wall;nodes[level.id]={...level,children:[wall.id,bath.id]}
 const screen=BathScreenNode.parse({side:end});return {nodes,bath,wall,screen}
}
test('bath-end mounts land fixed hinges on either wall face through bath and deck rotations',()=>{
 for(const rotation of [0,Math.PI/2,0.63])for(const end of ['left','right'] as const)for(const reverse of [false,true])for(const decked of [false,true]){
  const {nodes,bath,wall,screen}=fixture(rotation,end,reverse,decked),mount=bathScreenWallMount(screen,bath,nodes)!
  expect(mount).not.toBeNull();expect(mount.wallId).toBe(wall.id);expect(mount.position[0]).toBeCloseTo((end==='left'?-1:1)*(bath.length/2-0.045),6)
  expect(mount.position[2]).toBeCloseTo(bathScreenBasePose(screen,bath,nodes).position[2],6)
  const placed=attachBathScreen(screen,bath,nodes).placed;expect(placed.mounting).toBe('wall');expect(placed.wallId).toBe(wall.id)
 }
})
test('wall-bound screens reject wrong orientation, unsupported height, gaps, wall removal and body penetration',()=>{
 const {nodes,bath,wall,screen}=fixture(0,'left'),bound={...screen,mounting:'wall' as const,wallId:wall.id}
 expect(bathScreenWallMount(bound,bath,nodes)).not.toBeNull()
 expect(bathScreenWallMount(bound,{...bath,position:[3.1,0,4]},nodes)).toBeNull()
 expect(bathScreenWallMount(bound,{...bath,length:1.8},nodes)).toBeNull()
 expect(bathScreenWallMount(bound,bath,{...nodes,[wall.id]:{...wall,height:1.5}})).toBeNull()
 expect(bathScreenWallMount(bound,bath,{...nodes,[wall.id]:{...wall,visible:false}})).toBeNull()
 expect(bathScreenWallMount(bound,bath,{...nodes,[wall.id]:{...wall,end:[wall.end[0]+0.5,wall.end[1]]}})).toBeNull()
 const removed={...nodes};delete removed[wall.id];expect(bathScreenWallMount(bound,bath,removed)).toBeNull();expect(()=>attachBathScreen(bound,bath,removed)).toThrow('compatible bath-end wall')
})
