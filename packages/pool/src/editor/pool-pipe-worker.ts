import { searchSerializedPoolPipes } from '../design/pool-pipe-worker-search'

self.onmessage = (event: MessageEvent<Parameters<typeof searchSerializedPoolPipes>[0]>) => {
  try { self.postMessage({ result: searchSerializedPoolPipes(event.data) }) }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }) }
}
self.postMessage({ ready: true })
