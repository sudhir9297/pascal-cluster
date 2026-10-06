import { expect, test } from 'bun:test'

test('freehand tool owns SVG and canvas strokes, cancellation and closure', async () => {
  const toolPath = import.meta.resolve('./tool')
  const storePath = import.meta.resolve('./store')
  const nodesPath = import.meta.resolve('./scene-nodes')
  const script = `
    import { mock } from 'bun:test'
    import * as React from 'react'
    import * as Core from '@pascal-app/core'
    import { Group } from 'three'
    import { DEFAULT_POOL } from ${JSON.stringify(import.meta.resolve('../core/schema'))}
    const frames = new Map()
    let frameId = 0
    globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId }
    globalThis.cancelAnimationFrame = id => frames.delete(id)
    const tick = () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()) }
    const handlers = new Map()
    const emitter = {
      on: (name, handler) => handlers.set(name, handler),
      off: name => handlers.delete(name),
      emit: (name, event) => handlers.get(name)?.(event),
    }
    let refIndex = 0, created = [], cleanups = [], mode = 'build'
    const settings = { ...DEFAULT_POOL, shape: 'spline' }
    const scene = { nodes: {}, readOnly: false }
    const editor = { setDraftVertexCount() {}, setTool() {}, setMode: next => mode = next }
    mock.module('react', () => ({ ...React,
      useRef: value => ({ current: refIndex++ === 0 ? new Group() : value }),
      useMemo: fn => fn(), useState: value => [value, () => {}],
      useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) },
    }))
    mock.module('@pascal-app/core', () => ({ ...Core, emitter,
      useScene: Object.assign(selector => selector(scene), { getState: () => scene }),
    }))
    mock.module('@pascal-app/viewer', () => ({ useViewer: selector => selector({
      selection: { levelId: 'level_test' }, setSelection() {},
    }) }))
    mock.module('@react-three/fiber', () => ({ useThree: selector => selector({ camera: {} }) }))
    mock.module(${JSON.stringify(storePath)}, () => ({ usePoolStore: Object.assign(selector => selector(settings), { getState: () => settings }) }))
    mock.module(${JSON.stringify(nodesPath)}, () => ({
      nextSwimmingPoolName: () => 'Test Pool', getPoolNodes: () => [],
      createPoolPluginNode: node => created.push(node),
    }))
    mock.module('@pascal-app/editor', () => ({
      CursorSphere() {}, EDITOR_LAYER: 0, clearPlacementSurface() {}, clearSlabSnapFeedback() {},
      isAngleSnapActive: () => false, isGridSnapActive: () => false,
      markToolCancelConsumed() {}, publishHorizontalConstructionPlane() {}, publishPlacementSurface() {},
      resolvePointerSupportSurface: () => null,
      resolveEventConstructionPlane: () => ({ elevation: 0, localY: 0 }),
      resampleTerrainConstructionPlane: plane => plane,
      resolveSlabPlanPointSnap: args => ({ point: args.fallbackPoint }), triggerSFX() {},
      useEditor: Object.assign(selector => selector(editor), { getState: () => editor }),
      useFloorplanDraftPreview: { getState: () => ({ setPolygonDraft() {}, setCursorPoint() {} }) },
    }))
    class Element { closest() { return this.svg ?? null } }
    class Canvas extends Element {}
    class Svg extends Element {
      constructor() { super(); this.svg = this }
      querySelector() { return { getScreenCTM: () => ({ inverse: () => ({}) }) } }
    }
    class DOMPoint {
      constructor(x, y) { this.x = x; this.y = y }
      matrixTransform() { return { x: this.x / 10, y: this.y / 10 } }
    }
    Object.assign(globalThis, { Element, HTMLCanvasElement: Canvas, SVGSVGElement: Svg, DOMPoint,
      document: new EventTarget(), window: new EventTarget() })
    const { default: Tool } = await import(${JSON.stringify(toolPath)})
    function pointer(type, surface, id = 1) {
      const event = new Event(type, { cancelable: true })
      Object.defineProperty(event, 'target', { value: surface })
      Object.assign(event, { button: 0, pointerId: id, clientX: 0, clientY: 0 })
      document.dispatchEvent(event)
    }
    function move(x, z, target) { emitter.emit('grid:move', { position: [x, 0, z], nativeEvent: { target } }) }
    for (const surface of [new Svg(), new Canvas()]) {
      refIndex = 0; created = []; cleanups = []; mode = 'build'; Tool()
      move(0, 0, surface); pointer('pointerdown', surface)
      move(3, 0, surface); move(3, 3, surface)
      pointer('pointerup', surface, 2)
      if (created.length) throw new Error('Other pointer committed the stroke')
      move(0, 3, surface); pointer('pointerup', surface)
      if (created.length !== 1 || created[0].shape !== 'spline' || mode !== 'select') throw new Error('Stroke did not commit')
      cleanups.forEach(fn => fn())

      refIndex = 0; created = []; cleanups = []; mode = 'build'; Tool()
      move(0, 0, surface); pointer('pointerdown', surface)
      move(3, 0, surface); move(3, 3, surface); pointer('pointercancel', surface)
      pointer('pointerup', surface)
      if (created.length) throw new Error('Cancelled stroke committed')
      cleanups.forEach(fn => fn())

      refIndex = 0; created = []; cleanups = []; mode = 'build'; Tool()
      move(0, 0, surface); pointer('pointerdown', surface)
      move(3, 0, surface); move(3, 3, surface); move(0, 3, surface); move(0, 0, surface); tick()
      if (created.length !== 1 || mode !== 'build') throw new Error('Closure was not committed before release')
      pointer('pointerup', surface)
      if (created.length !== 1 || mode !== 'select') throw new Error('Closure release was not consumed')
      cleanups.forEach(fn => fn())
    }
  `
  const process = Bun.spawn([Bun.which('bun')!, '-e', script], { stdout: 'pipe', stderr: 'pipe' })
  const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text()])
  expect(stderr).toBe('')
  expect(exitCode).toBe(0)
})
