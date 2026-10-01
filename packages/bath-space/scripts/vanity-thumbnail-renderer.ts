import {AmbientLight,Box3,Color,DirectionalLight,Mesh,MeshStandardMaterial,PerspectiveCamera,PlaneGeometry,Scene,Vector3,WebGLRenderer,PMREMGenerator,ACESFilmicToneMapping,Group} from 'three'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import {buildFreestandingVanityGeometry} from '../src/freestanding-vanity/geometry'
import {buildCornerVanityGeometry} from '../src/freestanding-vanity/corner-geometry'
import {VanityNode,CornerVanityNode} from '../src/freestanding-vanity/schema'
async function main(){
const shape=new URLSearchParams(location.search).get('shape')??'freestanding--modern'
const {graph,sceneId}=await (await fetch(`/model/${shape}`)).json()
const vanity=VanityNode.parse(Object.values(graph.nodes).find((n:any)=>n.type.includes('vanity')))
const renderer=new WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=.8;renderer.shadowMap.enabled=true;document.body.append(renderer.domElement)
const scene=new Scene();scene.background=new Color('#eceae7');const pmrem=new PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment()).texture;scene.environmentIntensity=.4;scene.add(new AmbientLight('#ffffff',.35))
for(const [x,y,z,power] of [[-3,5,-3,1.5],[3,3,-1,.6],[0,3,3,.7]]){const light=new DirectionalLight('#ffffff',power);light.position.set(x!,y!,z!);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=light.shadow.camera.bottom=-3;light.shadow.camera.right=light.shadow.camera.top=3;light.shadow.bias=-.0001;scene.add(light)}
const root=new Group();root.add(vanity.type==='bath-space:corner-vanity'?buildCornerVanityGeometry(CornerVanityNode.parse(vanity)):buildFreestandingVanityGeometry(vanity));root.traverse(o=>{if(o instanceof Mesh){const m=(Array.isArray(o.material)?o.material[0]:o.material) as MeshStandardMaterial;o.material=new MeshStandardMaterial({color:m.color??'#ffffff',roughness:m.roughness??.25,metalness:m.metalness??0,side:m.side});o.castShadow=o.receiveShadow=true}});scene.add(root)
const box=new Box3().setFromObject(root),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3())
const ground=new Mesh(new PlaneGeometry(100,100),new MeshStandardMaterial({color:'#eceae7',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.002;ground.receiveShadow=true;scene.add(ground)
const direction=new Vector3(.85,.85,-1.5)
const camera=new PerspectiveCamera(32,innerWidth/innerHeight,.01,100);camera.position.copy(center).add(direction.normalize().multiplyScalar(Math.max(size.x,size.z,size.y)*2.35));camera.lookAt(center);renderer.render(scene,camera)
document.body.dataset.ready='true';document.body.dataset.shape=shape;document.body.dataset.sceneId=sceneId;document.body.dataset.camera=JSON.stringify({eye:camera.position.toArray(),target:center.toArray()})

}
main().catch(error=>{document.body.innerText=String(error.stack??error);document.body.dataset.error='true';console.error(error)})
