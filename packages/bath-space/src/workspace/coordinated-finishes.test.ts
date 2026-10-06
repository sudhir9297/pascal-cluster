import {expect,test} from 'bun:test'
import {LevelNode,WallNode,type AnyNode} from '@pascal-app/core'
import {MirrorNode} from '../mirror/schema'
import {TowelRailNode} from '../towel-rail/schema'
import {coordinatedFinishTargets,coordinatedFinishUpdates} from './coordinated-finishes'
test('coordinated scope excludes inherited hidden fixtures and keeps unselected and surface slots intact',()=>{
 const level=LevelNode.parse({}),wall=WallNode.parse({parentId:level.id,start:[0,0],end:[3,0]}),mirror=MirrorNode.parse({parentId:wall.id,slots:{frame:'old',glass:'glass'}}),rail=TowelRailNode.parse({parentId:wall.id,slots:{metal:'old'}})
 const nodes=Object.fromEntries([level,wall,mirror,rail].map(n=>[n.id,n])) as unknown as Record<string,AnyNode>
 const targets=coordinatedFinishTargets(nodes,{levelId:level.id})
 expect(targets).toHaveLength(2)
 expect(coordinatedFinishTargets({...nodes,[wall.id]:{...wall,visible:false}},{})).toEqual([])
 const selected=coordinatedFinishTargets(nodes,{selectedIds:[mirror.id]})
 const changes=coordinatedFinishUpdates(nodes,selected,'new')
 expect(changes).toHaveLength(1)
 expect((changes[0]?.data as {slots:Record<string,string>}).slots).toEqual({frame:'new',glass:'glass'})
 expect((coordinatedFinishUpdates(nodes,selected,'')[0]?.data as {slots:Record<string,string>}).slots).toEqual({glass:'glass'})
 expect(coordinatedFinishUpdates(nodes,targets,'old')).toEqual([])
})

test('multiple fitting slots merge into one fixture patch while preserving nonmetal surfaces',()=>{
 const level=LevelNode.parse({})
 const tap={...MirrorNode.parse({parentId:level.id}),type:'bath-space:tap',slots:{body:'old',trim:'old',handle:'old',custom:'keep'}} as unknown as AnyNode
 const head={...MirrorNode.parse({parentId:level.id}),type:'bath-space:shower-head',slots:{body:'old',nozzles:'rubber'}} as unknown as AnyNode
 const nodes=Object.fromEntries([level,tap,head].map(node=>[node.id,node]))
 const targets=coordinatedFinishTargets(nodes,{})
 expect(targets).toHaveLength(6)
 const changes=coordinatedFinishUpdates(nodes,targets,'brass')
 expect(changes).toHaveLength(2)
 expect((changes.find(change=>change.id===tap.id)?.data as {slots:Record<string,string>}).slots).toEqual({body:'brass',trim:'brass',handle:'brass',custom:'keep'})
 expect((changes.find(change=>change.id===head.id)?.data as {slots:Record<string,string>}).slots).toEqual({body:'brass',face:'brass',connector:'brass',nozzles:'rubber'})
 const updated={...nodes,...Object.fromEntries(changes.map(change=>[change.id,{...nodes[change.id],...change.data}]))}
 expect(coordinatedFinishUpdates(updated,targets,'brass')).toEqual([])
 expect((coordinatedFinishUpdates(updated,targets,'').find(change=>change.id===head.id)?.data as {slots:Record<string,string>}).slots).toEqual({nozzles:'rubber'})
})
