import { AmbientLight, Box3, Color, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, Vector3, WebGLRenderer, PMREMGenerator, ACESFilmicToneMapping } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildTapGeometry } from '../src/taps/geometry'
import { tapPresets } from '../src/taps/presets'
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.toneMapping=ACESFilmicToneMapping; renderer.toneMappingExposure=.85; renderer.setSize(320,320); renderer.setPixelRatio(2); renderer.shadowMap.enabled=true
const room=new RoomEnvironment(), pmrem=new PMREMGenerator(renderer), environment=pmrem.fromScene(room).texture
const scene=new Scene(); scene.background=new Color('#f1eeeb'); scene.environment=environment;scene.environmentIntensity=.85
scene.add(new AmbientLight('#ffffff',.8))
for(const [x,y,z,power] of [[-2,3,-2,2],[2,2,1,1.5],[0,1,-3,.6]]) {
 const light=new DirectionalLight('#ffffff',power);light.position.set(x!,y!,z!);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0001;scene.add(light)
}
const ground=new Mesh(new PlaneGeometry(200,200),new MeshStandardMaterial({color:'#f1eeeb',roughness:.9}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground)
const camera=new PerspectiveCamera(32,1,.001,100)
document.body.style.cssText='margin:0;padding:16px;background:#ddd;font:13px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:12px'
async function renderAll() {
 for(const preset of tapPresets) {
  const model=buildTapGeometry({presetId:preset.id,handleAngle:0} as any);scene.add(model)
  const box=new Box3().setFromObject(model), size=box.getSize(new Vector3()), center=box.getCenter(new Vector3())
  ground.position.y=box.min.y-.001
  const distance=Math.max(size.y,size.x,size.z)*2.45
  camera.position.copy(center).add(new Vector3(.7,.38,-1).normalize().multiplyScalar(distance));camera.lookAt(center)
  renderer.render(scene,camera)
  const blob=await new Promise<Blob>(resolve=>renderer.domElement.toBlob(blob=>resolve(blob!),'image/png'))
  await fetch(`/thumbnail/${preset.id}`,{method:'POST',body:blob})
  const card=document.createElement('div'),img=document.createElement('img');img.src=URL.createObjectURL(blob);img.style.width='100%';card.append(img,document.createTextNode(preset.label));document.body.append(card)
  scene.remove(model);model.traverse((part:any)=>{if(part.isMesh){part.geometry.dispose();part.material.dispose()}})
 }
 document.body.dataset.ready='true'
}
renderAll().catch(error=>{document.body.innerText=String(error);throw error})
