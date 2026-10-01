import {fileURLToPath} from 'node:url'
import {vanityThumbnailGraph} from './vanity-thumbnail-scene'
import {vanityThumbnailItems} from './vanity-thumbnail-scene'
const api='http://localhost:3002/api/scenes'
const created=process.env.VANITY_THUMBNAIL_SCENE_ID?await fetch(`${api}/${process.env.VANITY_THUMBNAIL_SCENE_ID}`):await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bath Space · vanity thumbnail studio',graph:vanityThumbnailGraph()})})
if(!created.ok)throw new Error(await created.text())
let saved=await created.json()
await Bun.write(new URL('../doc/thumbnail-references/vanity-studio-scene.json',import.meta.url),JSON.stringify(saved,null,2))
const bundle=await Bun.build({entrypoints:[fileURLToPath(new URL('./vanity-thumbnail-renderer.ts',import.meta.url))],target:'browser',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}})
if(!bundle.success)throw new Error(bundle.logs.join('\n'))
async function replace(graph:ReturnType<typeof vanityThumbnailGraph>){const r=await fetch(`${api}/${saved.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bath Space · vanity thumbnail studio',graph,expectedVersion:saved.version})});if(!r.ok)throw new Error(await r.text());saved=await r.json()}
const server=Bun.serve({port:5192,async fetch(request){const url=new URL(request.url)
 if(url.pathname==='/render.js')return new Response(bundle.outputs[0],{headers:{'Content-Type':'text/javascript'}})
 if(url.pathname.startsWith('/model/')){const shape=url.pathname.slice(7);if(!vanityThumbnailItems.includes(shape))return new Response('Unknown vanity',{status:404});await replace(vanityThumbnailGraph());const graph=vanityThumbnailGraph(shape);await replace(graph);return Response.json({graph,sceneId:saved.id})}
 if(url.pathname==='/clear'){await replace(vanityThumbnailGraph());return new Response('Cleared')}
 return new Response('<html><title>Vanity thumbnail scene</title><style>body{margin:0;overflow:hidden}</style><script type="module" src="/render.js"></script></html>',{headers:{'Content-Type':'text/html'}})
}})
console.log(JSON.stringify({studio:String(server.url),sceneId:saved.id,editor:`http://localhost:3002/scene/${saved.id}`,shapes:vanityThumbnailItems}))
