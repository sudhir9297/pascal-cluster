import { WebGPURenderer, PMREMGenerator } from '../../packages/landscape/node_modules/three/build/three.webgpu.js'
import * as THREE from '../../packages/landscape/node_modules/three'
import { OrbitControls } from '../../packages/landscape/node_modules/three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from '../../packages/landscape/node_modules/three/examples/jsm/environments/RoomEnvironment.js'
import { PondNode } from '../../packages/landscape/src/pond/schema'
import { buildPondGeometry, disposePondGeometry, updatePondWater, disturbPondWater, stirPondWater } from '../../packages/landscape/src/pond/geometry'
import { GroundAreaNode } from '../../packages/landscape/src/ground-areas/domain/schema'
import { buildGroundAreaGeometry } from '../../packages/landscape/src/ground-areas/rendering/geometry'
import { SiteNode } from '../../packages/landscape/node_modules/@pascal-app/core'
import { resolvePondTerrainPatch } from '../../packages/landscape/src/pond/site-terrain'
import { createPondTerrainField } from '../../packages/landscape/src/pond/terrain'
import { pondTerrainMaterial } from '../../packages/landscape/src/pond/materials'
const renderer = new WebGPURenderer({ antialias: true, forceWebGL: true })
await renderer.init()
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .8; renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap; document.body.append(renderer.domElement)
const scene = new THREE.Scene(); scene.background = new THREE.Color('#dbe4df')
const pmrem = new PMREMGenerator(renderer), room = new RoomEnvironment()
const env = pmrem.fromScene(room); scene.environment = env.texture; scene.environmentIntensity = .4; pmrem.dispose(); room.dispose()
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6.5, 9, 8)
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true
scene.add(new THREE.HemisphereLight('#e4f3ff', '#6e7852', .7))
const sun = new THREE.DirectionalLight('#fff0d8', 2.4); sun.position.set(-4, 10, 5); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(sun)
const site = SiteNode.parse({ id: 'site_demo' })
let pond = PondNode.parse({ parentId: site.id, width: 6, depth: 4, rockBorder: 'continuous', rockBorderPlacement: 'both', fishCount: 6, waterPreset: 'glass', waterClarity: 1.6, rippleStrength: .06 })
let object: THREE.Group, groundObject: THREE.Group
const ground = GroundAreaNode.parse({ parentId: site.id, surface: 'grass', outline: [[-8,-7],[8,-7],[8,7],[-8,7]] })
function rebuild() {
 if (object) { scene.remove(object); disposePondGeometry(object) }
 if (groundObject) { scene.remove(groundObject); disposePondGeometry(groundObject) }
 const nodes = { [site.id]: site, [pond.id]: pond, [ground.id]: ground } as never
 const sculpted = SiteNode.parse({ ...site, ...resolvePondTerrainPatch(site, nodes) })
 const ctx = { sceneNodes: { ...nodes, [site.id]: sculpted } } as never
 object = buildPondGeometry(pond, ctx);
 scene.add(object)
 groundObject = buildGroundAreaGeometry(ground, ctx)
 const field = createPondTerrainField(pond)
 groundObject.traverse(mesh => {
  if (!(mesh instanceof THREE.Mesh) || mesh.userData.slotId !== 'surface') return
  const positions = mesh.geometry.getAttribute('position')
  mesh.geometry.setAttribute('pondBlend', new THREE.Float32BufferAttribute(Array.from({length:positions.count}, (_,i) => field.blendAt(positions.getX(i),positions.getZ(i))),1))
  const previous = mesh.material as THREE.Material
  mesh.material = pondTerrainMaterial(pond, field.bounds); previous.dispose()
 })
 scene.add(groundObject)
 document.querySelector('#info')!.textContent = `${pond.width.toFixed(1)} × ${pond.depth.toFixed(1)} m · ${pond.basinDepth.toFixed(2)} m deep`
}
rebuild()
document.querySelector<HTMLSelectElement>('#shape')!.onchange = event => {
 const shape = (event.target as HTMLSelectElement).value
 pond = PondNode.parse({ ...pond, shape: shape === 'organic' ? 'custom' : shape,
  outline: shape === 'organic' ? Array.from({length: 64}, (_, i) => { const a = i / 64 * Math.PI * 2; return [Math.cos(a) * 0.5 * (1 - 0.28 * Math.sin(a)), Math.sin(a) * 0.5] }) : [] }); rebuild()
}
for (const key of ['width', 'depth', 'basinDepth', 'bankWidth', 'rippleStrength', 'waterColor', 'bank', 'rockBorder', 'rockBorderPlacement', 'rockBorderSize']) {
 document.querySelector<HTMLInputElement>(`#${key}`)!.oninput = event => {
  const element = event.target as HTMLInputElement
  pond = PondNode.parse({ ...pond, [key]: element.type === 'range' ? Number(element.value) : element.value }); rebuild()
 }
}
document.querySelector<HTMLInputElement>('#animated')!.onchange = event => { pond.animated = (event.target as HTMLInputElement).checked }
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
let draggingWater = false, previousWaterPoint: THREE.Vector3 | null = null, previousWaterTime = 0
const pointOnWater = (event: PointerEvent) => {
 const rect = renderer.domElement.getBoundingClientRect()
 pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
 ray.setFromCamera(pointer, camera)
 return ray.intersectObject(object.getObjectByName('pond-water')!, false)[0]?.point
}
document.querySelector<HTMLInputElement>('#makeWaves')!.onchange = event => {
 controls.enabled = !(event.target as HTMLInputElement).checked
 draggingWater = false; previousWaterPoint = null
}
renderer.domElement.addEventListener('pointerdown', event => {
 if (controls.enabled || !pond.animated) return
 const point = pointOnWater(event)
 if (!point) return
 draggingWater = true; previousWaterPoint = point; previousWaterTime = performance.now()
 renderer.domElement.setPointerCapture(event.pointerId)
 disturbPondWater(object, point)
})
renderer.domElement.addEventListener('pointermove', event => {
 if (!draggingWater || !previousWaterPoint) return
 const point = pointOnWater(event), now = performance.now()
 if (!point) return
 stirPondWater(object, previousWaterPoint, point, Math.max(.001, (now - previousWaterTime) / 1000))
 previousWaterPoint = point; previousWaterTime = now
})
renderer.domElement.addEventListener('pointerup', () => { draggingWater = false; previousWaterPoint = null })
addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight) })
const started = performance.now()
renderer.setAnimationLoop(() => { controls.update(); if (pond.animated) updatePondWater(object, (performance.now() - started) / 1000); renderer.render(scene,camera) })
