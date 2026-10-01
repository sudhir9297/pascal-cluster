import { fileURLToPath } from 'node:url'
import { tapPresetIds } from '../src/taps/presets'

const bundle = await Bun.build({
  entrypoints: [fileURLToPath(new URL('./tap-thumbnail-renderer.ts', import.meta.url))],
  target: 'browser',
})
if (!bundle.success) throw new Error(bundle.logs.join('\n'))
const renderer = bundle.outputs[0]!
const server = Bun.serve({ port: 5187, async fetch(request) {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname.startsWith('/thumbnail/')) {
    const id = url.pathname.slice('/thumbnail/'.length)
    if (!tapPresetIds.includes(id as typeof tapPresetIds[number])) return new Response('Unknown tap', { status: 400 })
    await Bun.write(new URL(`../src/taps/assets/${id}.png`, import.meta.url), await request.arrayBuffer())
    return new Response('ok')
  }
  if (url.pathname === '/render.js') return new Response(renderer, { headers: { 'Content-Type': 'text/javascript' } })
  if (url.pathname === '/') return new Response('<html><title>Tap model studio</title><script type="module" src="/render.js"></script></html>', { headers: { 'Content-Type': 'text/html' } })
  return new Response('Not found', { status: 404 })
} })
console.log(`Open ${server.url} to render and save all tap thumbnails.`)
