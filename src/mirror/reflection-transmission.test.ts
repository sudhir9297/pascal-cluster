import { expect, test } from 'bun:test'
import { BoxGeometry, Color, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, Scene } from 'three'
import { captureReflection, createReflection } from './reflection-material'
import { MirrorNode } from './schema'
for (const fails of [false, true]) test(`mirror capture restores glass visibility${fails ? ' on failure' : ''}`, () => {
 const scene = new Scene(), camera = new PerspectiveCamera(), entry = createReflection(MirrorNode.parse({}))
 const glass = new Mesh(new BoxGeometry(), new MeshPhysicalMaterial({transmission:0.45, transparent:true}))
 const mixed = new Mesh(new BoxGeometry(), [new MeshStandardMaterial(), new MeshPhysicalMaterial({transmission:0.2})])
 const hidden = new Mesh(new BoxGeometry(), new MeshPhysicalMaterial({transmission:1})); hidden.visible=false
 const frame = new Mesh(new BoxGeometry(), new MeshStandardMaterial())
 scene.add(glass,mixed,hidden,frame,entry.mesh)
 entry.reflection.reflector.updateBefore = (() => {
  expect(scene.background instanceof Color).toBe(true)
  expect(glass.visible).toBe(false); expect(mixed.visible).toBe(false); expect(hidden.visible).toBe(false); expect(frame.visible).toBe(true)
  if(fails) throw new Error('capture failed')
 }) as typeof entry.reflection.reflector.updateBefore
 const run=()=>captureReflection(entry,scene,camera,{},0.5)
 if(fails) expect(run).toThrow('capture failed'); else run()
 expect(scene.background).toBeNull()
 expect(glass.visible).toBe(true); expect(mixed.visible).toBe(true); expect(hidden.visible).toBe(false); expect(entry.mesh.visible).toBe(true)
 expect((glass.material as MeshPhysicalMaterial).transmission).toBe(0.45)
 scene.traverse(n=>{if(n instanceof Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose()}})
 entry.reflection.dispose()
})

test('outline depth overrides cannot overwrite a lit mirror capture', async () => {
 const { installReflectionSnapshotCapture } = await import('./reflection-material')
 const scene = new Scene(), camera = new PerspectiveCamera(), entry = createReflection(MirrorNode.parse({}))
 scene.add(entry.mesh)
 const colorPass = () => {}, depthPass = () => {}
 let current = colorPass, captures = 0
 const renderer = {backend:{device:{}}, getRenderObjectFunction:()=>current}
 entry.reflection.reflector.updateBefore = (()=>{captures++}) as typeof entry.reflection.reflector.updateBefore
 const release = installReflectionSnapshotCapture(scene,()=>[entry],()=>null,()=>0,{current:false},()=>{},renderer)
 const draw = ()=>scene.onBeforeRender(renderer as never, scene, camera, null as never, null as never, null as never)
 current = depthPass; draw(); expect(captures).toBe(0)
 current = colorPass; draw(); expect(captures).toBe(1)
 current = depthPass; draw(); expect(captures).toBe(1)
 current = colorPass; scene.overrideMaterial = new MeshStandardMaterial(); draw(); expect(captures).toBe(1)
 scene.overrideMaterial.dispose(); scene.overrideMaterial=null
 release(); entry.mesh.geometry.dispose(); entry.material.dispose(); entry.reflection.dispose()
})
