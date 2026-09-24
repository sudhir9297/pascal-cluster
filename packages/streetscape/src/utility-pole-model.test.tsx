import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UtilityPoleNode } from './schema'
import { UtilityPoleModel } from './utility-pole-model'

describe('utility pole assembly rendering', () => {
  test('renders every structural assembly in ghost and committed states', () => {
    const previousConsoleError = console.error
    console.error = () => {}

    try {
      for (const assembly of ['tangent', 'small-angle', 'junction', 'dead-end'] as const) {
        const node = UtilityPoleNode.parse({ assembly, transformerMounted: false })
        const ghostMarkup = renderToStaticMarkup(
          createElement(UtilityPoleModel, { ghost: true, layer: 1, node }),
        )
        const committedMarkup = renderToStaticMarkup(
          createElement(UtilityPoleModel, { ghost: false, layer: 1, node }),
        )

        expect(ghostMarkup.length).toBeGreaterThan(0)
        expect(committedMarkup.length).toBeGreaterThan(0)
      }
    } finally {
      console.error = previousConsoleError
    }
  })
})
