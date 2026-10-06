import {expect,test} from 'bun:test'
import {Box3,Mesh} from 'three'
import {WallNode} from '@pascal-app/core'
import {TowelRailNode,towelRailPresets} from './schema'
import {buildTowelRailGeometry} from './geometry'
import {towelRailPlacement} from './placement'
test('single and double rails fit authored bounds and expose metal for painting',()=>{
 for(const preset of towelRailPresets)for(const width of [0.3,1.2]){
  const n=TowelRailNode.parse({...preset,width}),root=buildTowelRailGeometry(n),box=new Box3().setFromObject(root)
  expect(box.max.x-box.min.x).toBeCloseTo(width,5)
  expect(box.max.y-box.min.y).toBeCloseTo(n.height,5)
  expect(box.min.z).toBeGreaterThanOrEqual(-0.000001)
  expect(box.max.z).toBeCloseTo(n.depth+0.01,5)
  root.traverse(object=>{if(object instanceof Mesh)expect(object.userData.slotId).toBe('metal')})
 }
})
test('rails reject insufficient walls and maintain height on either wall face',()=>{
 const n=TowelRailNode.parse({}),wall=WallNode.parse({start:[0,0],end:[3,0],height:2.5,thickness:0.2})
 expect(towelRailPlacement(n,wall,1,'back')?.position).toEqual([1,1.2,-0.1])
 expect(towelRailPlacement(n,wall,1,'front')?.rotation).toBe(0)
 expect(towelRailPlacement(n,{...wall,end:[0.2,0]},0.1,'front')).toBeNull()
 expect(towelRailPlacement({...n,mountingHeight:2.49},wall,1,'front')).toBeNull()
})
