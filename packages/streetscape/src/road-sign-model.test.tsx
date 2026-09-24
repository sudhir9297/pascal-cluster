import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ROAD_SIGN_CATALOG } from './road-sign-config'
import { RoadSignModel } from './road-sign-model'
import { RoadSignNode } from './schema'

describe('road sign model mounting', () => {
  test('keys every flat post mesh child', () => {
    const source = readFileSync(new URL('./road-sign-model.tsx', import.meta.url), 'utf8')
    for (const part of ['web', 'flange-left', 'flange-right']) {
      expect(source).toMatch(new RegExp(`<boxGeometry\\s+key="${part}-geometry"`))
      expect(source).toMatch(new RegExp(`<SignMetalMaterial(?=[^>]*key="${part}-material")`))
    }
  })

  test('renders every catalog sign in single- and double-post modes', () => {
    const previousDocument = globalThis.document
    const previousConsoleError = console.error
    const renderErrors: string[] = []
    globalThis.document = {
      createElementNS: () => ({
        addEventListener() {},
        removeEventListener() {},
      }),
    } as unknown as Document
    console.error = (...args) => renderErrors.push(args.join(' '))

    try {
      for (const entry of ROAD_SIGN_CATALOG) {
        const singleMarkup = renderToStaticMarkup(
          createElement(RoadSignModel, {
            layer: 1,
            node: RoadSignNode.parse({ signId: entry.id, mounting: 'single-post' }),
          }),
        )
        const doubleMarkup = renderToStaticMarkup(
          createElement(RoadSignModel, {
            layer: 1,
            node: RoadSignNode.parse({ signId: entry.id, mounting: 'double-post' }),
          }),
        )

        expect(singleMarkup.length).toBeGreaterThan(0)
        expect(doubleMarkup.length).toBeGreaterThan(singleMarkup.length)
      }
      expect(renderErrors.some((message) => message.includes('Each child in a list'))).toBe(false)
    } finally {
      console.error = previousConsoleError
      if (previousDocument) globalThis.document = previousDocument
      else Reflect.deleteProperty(globalThis, 'document')
    }
  })
})
