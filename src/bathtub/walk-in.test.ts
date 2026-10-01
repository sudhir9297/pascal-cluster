import {bathDrainPosition} from './drain'
import {expect,test} from 'bun:test'
import {LevelNode,nodeRegistry,registerNode,useScene,type AnyNode,type AnyNodeDefinition,type AnyNodeId} from '@pascal-app/core'
import {bathtubDefinition} from './definition'
import {Box3,Mesh,Raycaster,Vector3} from 'three'
import {BathtubNode} from './schema'
import {buildBathtubGeometry} from './geometry'
import {walkInLayout} from './walk-in-geometry'
import {bathSection} from './section'
function dispose(root:ReturnType<typeof buildBathtubGeometry>){root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose()})}
test('walk-in doors expose a real low opening, swing inward away from the mirrored seat, and retain an open drain',()=>{
  for(const doorSide of ['left','right'] as const)for(const doorOpening of [0,0.5,1]) {
    const node=BathtubNode.parse({shape:'walk-in',length:1.5,height:0.99,doorSide,doorOpening,drainCover:false}),layout=walkInLayout(node),root=buildBathtubGeometry(node)
    root.updateMatrixWorld(true)
    const pivot=root.getObjectByName('walk-in-door-pivot')!
    expect(pivot.rotation.y).toBeCloseTo(-layout.sign*doorOpening*Math.PI/2,6)
    const ray=new Raycaster(new Vector3(layout.doorX,layout.threshold+0.1,-2),new Vector3(0,0,1))
    const frontHits=ray.intersectObject(root,true).filter(hit=>hit.point.z<-node.width/2+layout.wall+0.02)
    if(doorOpening===0)expect(frontHits.some(hit=>hit.object.name==='walk-in-door')).toBe(true)
    if(doorOpening===1)expect(frontHits).toHaveLength(0)
    expect(new Raycaster(new Vector3(bathDrainPosition(node)[0],2,bathDrainPosition(node)[1]),new Vector3(0,-1,0)).intersectObject(root,true)).toHaveLength(0)
    const seat=new Box3().setFromObject(root.getObjectByName('walk-in-seat')!)
    expect(seat.max.y).toBeCloseTo(layout.seatHeight,6)
    expect(Math.sign(seat.getCenter(new Vector3()).x)).toBe(layout.sign)
    expect(new Box3().setFromObject(pivot).intersectsBox(seat)).toBe(false)
    expect(root.getObjectByName('walk-in-door-seal')).toBeDefined()
    dispose(root)
  }
})
test('walk-in geometry and access drawings remain finite at design limits',()=>{
  for(const small of [true,false])for(const doorSide of ['left','right'] as const) {
    const node=BathtubNode.parse({shape:'walk-in',doorSide,length:small?1.2:2.2,width:small?0.65:1.1,height:small?0.85:1.15,rimWidth:small?0.035:0.12,doorWidth:0.65,seatDepth:0.55,seatHeight:0.55,doorOpening:1}),root=buildBathtubGeometry(node)
    root.traverse(o=>{if(o instanceof Mesh)for(const key of ['position','normal','uv'])for(const value of o.geometry.getAttribute(key).array)expect(Number.isFinite(value)).toBe(true)})
    const section=bathSection(node)
    expect(section.dimensions.map(d=>d.key)).not.toContain('bowlDepth')
    for(const key of ['doorWidth','seatHeight','seatDepth','thresholdHeight'])expect(section.dimensions.map(d=>d.key)).toContain(key)
    expect(section.drawing.planDetail).not.toContain('NaN')
    dispose(root)
  }
})

test('walk-in door and handedness survive scene serialization and undo/redo',()=>{
  const snapshot=useScene.getState(),restore=nodeRegistry._snapshot(),raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
  try {
    registerNode(bathtubDefinition as unknown as AnyNodeDefinition)
    const level=LevelNode.parse({}),bath=BathtubNode.parse({shape:'walk-in',height:0.99,parentId:level.id})
    useScene.setState({nodes:{[level.id]:level,[bath.id]:bath as unknown as AnyNode},rootNodeIds:[level.id],readOnly:false,dirtyNodes:new Set()});useScene.temporal.getState().clear()
    useScene.getState().updateNode(bath.id as AnyNodeId,{doorOpening:1,doorSide:'right'} as never)
    const saved=BathtubNode.parse(JSON.parse(JSON.stringify(useScene.getState().nodes[bath.id as AnyNodeId])))
    expect(saved.doorOpening).toBe(1);expect(saved.doorSide).toBe('right')
    const geometry=buildBathtubGeometry(saved)
    expect(geometry.getObjectByName('walk-in-door-pivot')!.rotation.y).toBeCloseTo(Math.PI/2,6);dispose(geometry)
    useScene.temporal.getState().undo()
    expect(BathtubNode.parse(useScene.getState().nodes[bath.id as AnyNodeId]).doorOpening).toBe(0)
    expect(BathtubNode.parse(useScene.getState().nodes[bath.id as AnyNodeId]).doorSide).toBe('left')
    useScene.temporal.getState().redo()
    expect(BathtubNode.parse(useScene.getState().nodes[bath.id as AnyNodeId]).doorOpening).toBe(1)
  }finally{useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})
