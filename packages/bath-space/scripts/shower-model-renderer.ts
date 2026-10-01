import { showerFlangePresets,flangePresetNode } from '../src/shower-flange/schema'
import { buildShowerFlangeGeometry } from '../src/shower-flange/geometry'
import { showerValvePresets,valvePresetNode } from '../src/shower-valve/schema'
import { buildShowerValveGeometry } from '../src/shower-valve/geometry'
import { showerKitPresets, kitAnchor } from '../src/shower-kit/bundle'
import { buildKitPreview } from '../src/shower-kit/geometry'
import {showerAssemblyPresets,assemblyPresetNode} from '../src/shower-assembly/schema'
import {buildAssemblyPreview} from '../src/shower-assembly/geometry'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
  type Group,
} from 'three'
import { buildShowerHeadGeometry } from '../src/shower-head/geometry'
import { ShowerHeadNode, showerHeadPresets } from '../src/shower-head/schema'
import { buildShowerArmGeometry } from '../src/shower-arm/geometry'
import { ShowerArmNode } from '../src/shower-arm/schema'
import { showerHeadTarget } from '../src/shower-arm/attachment'
import { buildShowerMountGeometry } from '../src/shower-mount/geometry'
import { ShowerMountNode, showerMountPresets, hasHolder } from '../src/shower-mount/schema'
import { showerMountSockets } from '../src/shower-mount/targets'
import { buildHandShowerGeometry } from '../src/hand-shower/geometry'
import { HandShowerNode, handShowerPresets } from '../src/hand-shower/schema'
import { ShowerHoseNode, showerHosePresets } from '../src/shower-hose/schema'
import { buildHoseAt } from '../src/shower-hose/geometry'
import { showerControlPresets, controlPresetNode } from '../src/shower-control/schema'
import { buildShowerControlGeometry } from '../src/shower-control/geometry'
import { wallSpoutPresets, wallSpoutPresetNode } from '../src/wall-spout/schema'
import { buildWallSpoutGeometry } from '../src/wall-spout/geometry'
import { bodyJetPresets, bodyJetPresetNode } from '../src/body-jet/schema'
import { buildBodyJetGeometry } from '../src/body-jet/geometry'
const family = new URLSearchParams(location.search).get('family')
document.body.style.cssText =
  'margin:0;padding:20px;background:#e7e5e2;font:14px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-content:start;grid-auto-rows:min-content'
function card(root: Group, labelText: string, direction = new Vector3(0.7, 0.2, 1)) {
  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setSize(380, 280)
  renderer.setPixelRatio(1)
  const scene = new Scene()
  scene.background = new Color('#eceae7')
  scene.add(new AmbientLight('#ffffff', 2))
  const light = new DirectionalLight('#ffffff', 4)
  light.position.set(2, 4, 3)
  scene.add(light)
  root.traverse((o) => {
    if (o instanceof Mesh)
      o.material = new MeshStandardMaterial({
        color: family === 'flange' ? '#a7adb5' : family === 'valve' ? (o.userData.slotId === 'housing' ? '#3b756c' : ['body','ports'].includes(o.userData.slotId) ? '#b79b62' : '#686b70') : family === 'kit' ? (o.userData.slotId === 'nozzles' ? '#50555c' : '#a7adb5') : family === 'assembly' && o.userData.assemblyPart && o.userData.slotId === 'body' ? '#42464d' : family === 'assembly' && ['pipe','brackets','holder','controls'].includes(o.userData.slotId) ? '#a7adb5' : ['markings', 'aerator'].includes(o.userData.slotId)
          ? '#404040'
          : o.userData.slotId === 'nozzles'
            ? '#8c9298'
            : '#fafafa',
        roughness: 0.35,
        metalness: 0.15,
      })
  })
  scene.add(root)
  const box = new Box3().setFromObject(root),
    center = box.getCenter(new Vector3()),
    size = box.getSize(new Vector3()),
    camera = new PerspectiveCamera(35, 380 / 280, 0.001, 20)
  camera.position
    .copy(center)
    .add(direction.normalize().multiplyScalar(Math.max(size.x, size.y, size.z) * (family === 'kit' ? 1.9 : 2.5)))
  camera.lookAt(center)
  renderer.render(scene, camera)
  const element = document.createElement('div')
  element.style.cssText = 'background:white;padding:10px;border-radius:8px'
  const preview = document.createElement('img')
  preview.src = renderer.domElement.toDataURL()
  preview.width = 380
  preview.height = 280
  element.append(preview)
  renderer.dispose()
  renderer.forceContextLoss()
  const label = document.createElement('p')
  label.textContent = labelText
  element.append(label)
  document.body.append(element)
}
if (!family || family === 'assembly')
  for(const p of showerAssemblyPresets) card(buildAssemblyPreview(assemblyPresetNode(p)),p.label,new Vector3(.8,.12,1))
if (!family || family === 'spout')
  for (const p of wallSpoutPresets)
    card(buildWallSpoutGeometry(wallSpoutPresetNode(p)), p.label, new Vector3(0.9, 0.5, 1))
if (!family || family === 'jet')
  for (const p of bodyJetPresets) card(buildBodyJetGeometry(bodyJetPresetNode(p)), p.label)
if (!family || family === 'control')
  for (const p of showerControlPresets)
    card(buildShowerControlGeometry(controlPresetNode(p)), p.label)
if (!family || family === 'hose')
  for (const p of showerHosePresets) {
    const n = ShowerMountNode.parse({ style: 'round-combined' }),
      root = buildShowerMountGeometry(n),
      slot = showerMountSockets(n).find((s) => s.id === 'hand-shower')!,
      supply = showerMountSockets(n).find((s) => s.id === 'hose')!,
      handNode = HandShowerNode.parse({}),
      hand = buildHandShowerGeometry(handNode)
    hand.position.fromArray(slot.position)
    hand.rotation.set(...slot.rotation)
    root.add(hand)
    hand.updateMatrix()
    const end = new Vector3(0, -handNode.gripInsertion - 0.018, 0)
        .applyMatrix4(hand.matrix)
        .sub(new Vector3(...supply.position)),
      direction = new Vector3(0, -1, 0).applyEuler(hand.rotation),
      hose = buildHoseAt(ShowerHoseNode.parse(p), end, direction)
    hose.position.fromArray(supply.position)
    root.add(hose)
    card(root, p.label)
  }
if (!family || family === 'mount')
  for (const p of showerMountPresets) {
    const n = ShowerMountNode.parse(p),
      root = buildShowerMountGeometry(n)
    if (hasHolder(n)) {
      const hand = buildHandShowerGeometry(HandShowerNode.parse({})),
        slot = showerMountSockets(n).find((s) => s.id === 'hand-shower')!
      hand.position.fromArray(slot.position)
      hand.rotation.set(...slot.rotation)
      root.add(hand)
    }
    card(root, p.label)
  }
if (!family || family === 'hand')
  for (const p of handShowerPresets) card(buildHandShowerGeometry(HandShowerNode.parse(p)), p.label)
if (!family || family === 'head')
  for (const p of showerHeadPresets) {
    const arm = ShowerArmNode.parse({}),
      root = buildShowerArmGeometry(arm),
      head = buildShowerHeadGeometry(ShowerHeadNode.parse(p)),
      target = showerHeadTarget(arm)
    head.position.fromArray(target.position)
    head.rotation.set(...target.rotation)
    root.add(head)
    card(root, p.label, new Vector3(0.7, -0.45, 1))
  }
if (!family || family === 'kit')
  for (const p of showerKitPresets) card(buildKitPreview(p, kitAnchor(p)), p.label)
if (!family || family === 'valve')
  for (const p of showerValvePresets) card(buildShowerValveGeometry(valvePresetNode(p)), p.label)
if (!family || family === 'flange')
  for (const p of showerFlangePresets) card(buildShowerFlangeGeometry(flangePresetNode(p)),p.label,new Vector3(.4,.25,1))
document.body.dataset.ready = 'true'
