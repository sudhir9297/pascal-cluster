import { fileURLToPath } from 'node:url'
const bundle=await Bun.build({entrypoints:[fileURLToPath(new URL('./shower-model-renderer.ts',import.meta.url))],target:'browser',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}})
if(!bundle.success)throw new Error(bundle.logs.join('\n'))
const server=Bun.serve({port:5188,fetch(request){const url=new URL(request.url);if(url.pathname==='/render.js')return new Response(bundle.outputs[0],{headers:{'Content-Type':'text/javascript'}});return new Response('<html><title>Shower model gallery</title><script type="module" src="/render.js"></script></html>',{headers:{'Content-Type':'text/html'}})}})
console.log(`Shower model gallery: ${server.url}`)
