import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { CatalogLampModel } from './catalog-lamp-model'
import {
  CATALOG_LAMP_VARIANTS,
  getCatalogLampStyleOptions,
  parseCatalogLamp,
  resolveCatalogLampProjection,
} from './catalog-lamp-config'
import { CATALOG_LAMP_THUMBNAILS, getCatalogLampThumbnail } from './catalog-lamp-thumbnails'

describe('structural catalog lamp rendering', () => {
  test('normalizes stale visual styles back to the active structural variant', () => {
    expect(resolveCatalogLampProjection('environment:catenary-street-light', 'stale-style')).toBe('catenary')
    expect(resolveCatalogLampProjection('environment:wall-pack-light', 'stale-style')).toBe('wall-pack')
    expect(resolveCatalogLampProjection('environment:wall-pack-light', 'catenary')).toBe('catenary')
  })

  test('renders every structural projection safely in ghost and committed states', () => {
    const structuralVariants = CATALOG_LAMP_VARIANTS.filter((variant) => variant.family === 'structure')
    const previousConsoleError = console.error
    console.error = () => {}

    try {
      for (const variant of structuralVariants) {
        for (const option of getCatalogLampStyleOptions(variant.kind)) {
          const node = parseCatalogLamp(variant.kind, {
            armLength: variant.arm[2],
            height: 6,
            lightOn: true,
            visualStyle: option.value,
          })
          const ghostMarkup = renderToStaticMarkup(
            createElement(CatalogLampModel, { ghost: true, layer: 1, node }),
          )
          const committedMarkup = renderToStaticMarkup(
            createElement(CatalogLampModel, { ghost: false, layer: 1, node }),
          )

          expect(ghostMarkup).not.toContain('spotLight')
          expect(ghostMarkup).not.toContain('pointLight')
          expect(ghostMarkup).not.toContain('castShadow="true"')
          expect(ghostMarkup).toContain('name="catalog-lamp-pole"')
          expect(committedMarkup).toContain('name="catalog-lamp-pole"')
          expect(committedMarkup.length).toBeGreaterThan(0)
        }
      }
    } finally {
      console.error = previousConsoleError
    }
  })

  test('renders every catalog projection across every family style', () => {
    const previousConsoleError = console.error
    console.error = () => {}

    try {
      for (const variant of CATALOG_LAMP_VARIANTS) {
        for (const option of getCatalogLampStyleOptions(variant.kind)) {
          const node = parseCatalogLamp(variant.kind, {
            armLength: variant.arm[2],
            height: 6,
            lightOn: true,
            visualStyle: option.value,
          })
          const ghostMarkup = renderToStaticMarkup(
            createElement(CatalogLampModel, { ghost: true, layer: 1, node }),
          )
          const committedMarkup = renderToStaticMarkup(
            createElement(CatalogLampModel, { ghost: false, layer: 1, node }),
          )

          expect(ghostMarkup).not.toContain('spotLight')
          expect(ghostMarkup).not.toContain('pointLight')
          expect(committedMarkup).toContain('catalog-')
          expect(committedMarkup.length).toBeGreaterThan(0)
        }
      }
    } finally {
      console.error = previousConsoleError
    }
  })

  test('provides unique square thumbnails for every catalog projection', () => {
    const projections = CATALOG_LAMP_VARIANTS.map((variant) => variant.projection)
    const thumbnails = projections.map((projection) => getCatalogLampThumbnail(projection))

    expect(new Set(thumbnails).size).toBe(new Set(projections).size)
    expect(Object.keys(CATALOG_LAMP_THUMBNAILS)).toHaveLength(new Set(projections).size)
    for (const thumbnail of thumbnails) {
      const svg = decodeURIComponent(thumbnail.split(',')[1] ?? '')
      expect(svg).toContain('viewBox="0 0 640 640"')
      expect(svg).toContain('<title')
    }
  })

  test('builds the catenary style as a two-pole sagging suspension', () => {
    const variant = CATALOG_LAMP_VARIANTS.find((candidate) => candidate.projection === 'catenary')!
    const node = parseCatalogLamp(variant.kind, {
      armLength: 6,
      height: 6,
      visualStyle: 'catenary',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-catenary-lamp"')
    expect(markup).toContain('name="catalog-catenary-span"')
    expect(markup).toContain('name="catalog-suspended-housing"')
    expect((markup.match(/name="catalog-suspended-end-cap"/g) ?? []).length).toBe(2)
    expect(markup).toContain('name="catalog-suspended-reflector"')
    expect(markup).toContain('name="catalog-suspended-diffuser"')
    expect(markup).toContain('name="catalog-suspended-trim"')
    expect(markup).toContain('name="catalog-catenary-cable-clamp"')
    expect(markup).toContain('torusGeometry')
    expect((markup.match(/name="catalog-lamp-pole"/g) ?? []).length).toBe(2)
    expect(markup).toContain('tubeGeometry')
  })

  test('builds the wall-arm style as an attached bracket and cobra head', () => {
    const node = parseCatalogLamp('environment:wall-arm-light', {
      armLength: 1.4,
      height: 6,
      lightOn: false,
      visualStyle: 'wall-arm',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-wall-arm-lamp"')
    expect(markup).toContain('name="catalog-wall-arm-mount-plate"')
    expect((markup.match(/name="catalog-wall-arm-mount-bolt"/g) ?? []).length).toBe(4)
    expect(markup).toContain('name="catalog-wall-arm-curved-bracket"')
    expect(markup).toContain('name="catalog-wall-arm-support-brace"')
    expect(markup).toContain('name="catalog-wall-arm-head"')
    expect(markup).toContain('#59636b')
    expect(markup).toContain('tubeGeometry')
    expect(markup).not.toContain('spotLight')
  })

  test('builds the area pole as a square tapered support with a multi-cell LED head', () => {
    const node = parseCatalogLamp('environment:shoebox-area-light', {
      height: 6,
      lightOn: false,
      visualStyle: 'shoebox',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-shoebox-area-light"')
    expect(markup).toContain('name="catalog-shoebox-square-pole"')
    expect(markup).toContain('name="catalog-shoebox-base-plate"')
    expect(markup).toContain('name="catalog-shoebox-access-door"')
    expect((markup.match(/name="catalog-shoebox-anchor-nut"/g) ?? []).length).toBe(4)
    expect((markup.match(/name="catalog-shoebox-area-side"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-integrated-arm"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-tapered-arm"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-arm-lower-brace"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-area-housing"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-service-door"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-optic-window"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-optic-module"/g) ?? []).length).toBe(3)
    expect((markup.match(/name="catalog-shoebox-optic-cell"/g) ?? []).length).toBe(18)
    expect((markup.match(/name="catalog-shoebox-heat-sink-fin"/g) ?? []).length).toBe(7)
    expect((markup.match(/name="catalog-shoebox-driver-cover"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-shoebox-photocell"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('spotLight')
  })

  test('gives the active single-sided area pole one roadway beam', () => {
    const node = parseCatalogLamp('environment:shoebox-area-light', {
      lightOn: true,
      visualStyle: 'shoebox',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect((markup.match(/<spotLight/g) ?? []).length).toBe(1)
  })

  test('builds the solar street light as a serviceable all-in-one PV luminaire', () => {
    const node = parseCatalogLamp('environment:solar-street-light', {
      armLength: 1.3,
      height: 6,
      lightOn: false,
      visualStyle: 'solar',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-solar-street-light"')
    expect(markup).toContain('name="catalog-solar-pole"')
    expect(markup).toContain('name="catalog-solar-base-plate"')
    expect((markup.match(/name="catalog-solar-anchor-nut"/g) ?? []).length).toBe(4)
    expect(markup).toContain('name="catalog-solar-service-door"')
    expect((markup.match(/name="catalog-solar-side"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-upswept-arm"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-spigot-adapter"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-integrated-head"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-die-cast-housing"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-panel"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-panel-surface"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('name="catalog-solar-photovoltaic-cell"')
    expect((markup.match(/name="catalog-solar-battery-door"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-optic-window"/g) ?? []).length).toBe(1)
    expect((markup.match(/name="catalog-solar-optic-cell"/g) ?? []).length).toBe(20)
    expect((markup.match(/name="catalog-solar-motion-sensor"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('spotLight')
  })

  test('gives the active single-sided solar light one roadway beam', () => {
    const node = parseCatalogLamp('environment:solar-street-light', {
      lightOn: true,
      visualStyle: 'solar',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect((markup.match(/<spotLight/g) ?? []).length).toBe(1)
  })

  test('builds the high mast as a lowering ring with six serviceable LED luminaires', () => {
    const node = parseCatalogLamp('environment:high-mast-crown-light', {
      lightOn: false,
      visualStyle: 'high-mast',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-high-mast-crown-light-assembly"')
    expect(markup).toContain('name="high-mast-crown-carrier-ring"')
    expect(markup).toContain('name="high-mast-crown-head-frame"')
    expect((markup.match(/name="high-mast-crown-latching-barrel"/g) ?? []).length).toBe(3)
    expect((markup.match(/name="high-mast-crown-hoisting-cable"/g) ?? []).length).toBe(3)
    expect((markup.match(/name="high-mast-crown-radial-arm"/g) ?? []).length).toBe(6)
    expect((markup.match(/name="high-mast-crown-luminaire-housing"/g) ?? []).length).toBe(6)
    expect((markup.match(/name="high-mast-crown-optic-cell"/g) ?? []).length).toBe(36)
    expect((markup.match(/name="high-mast-crown-heat-sink-fin"/g) ?? []).length).toBe(24)
    expect(markup).not.toContain('spotLight')
  })

  test('gives each active high-mast luminaire its own outward roadway beam', () => {
    const node = parseCatalogLamp('environment:high-mast-crown-light', {
      lightOn: true,
      visualStyle: 'high-mast',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect((markup.match(/<spotLight/g) ?? []).length).toBe(6)
  })

  test('builds the floodlight as a braced yoke-mounted multi-cell projector', () => {
    const node = parseCatalogLamp('environment:floodlight-pole', {
      armLength: 0.9,
      height: 6,
      lightOn: false,
      visualStyle: 'floodlight',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-floodlight-pole"')
    expect(markup).toContain('name="catalog-floodlight-base-plate"')
    expect((markup.match(/name="catalog-floodlight-anchor-bolt"/g) ?? []).length).toBe(4)
    expect(markup).toContain('name="catalog-floodlight-pole-shaft"')
    expect(markup).toContain('name="catalog-floodlight-access-door"')
    expect(markup).toContain('name="catalog-floodlight-arm-brace"')
    expect(markup).toContain('name="catalog-floodlight-yoke"')
    expect((markup.match(/name="catalog-floodlight-yoke-arm"/g) ?? []).length).toBe(2)
    expect(markup).toContain('name="catalog-floodlight-housing"')
    expect(markup).toContain('name="catalog-floodlight-driver-box"')
    expect(markup).toContain('name="catalog-floodlight-optic-window"')
    expect((markup.match(/name="catalog-floodlight-optic-cell"/g) ?? []).length).toBe(12)
    expect((markup.match(/name="catalog-floodlight-heat-sink-fin"/g) ?? []).length).toBe(5)
    expect(markup).toContain('name="catalog-floodlight-glare-visor"')
    expect(markup).not.toContain('spotLight')
  })

  test('builds the wall-pack style as a compact grounded bulkhead', () => {
    const node = parseCatalogLamp('environment:wall-pack-light', {
      armLength: 0.35,
      height: 6,
      lightOn: false,
      visualStyle: 'wall-pack',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-wall-pack-lamp"')
    expect(markup).toContain('name="catalog-wall-pack-mount-plate"')
    expect(markup).toContain('name="catalog-wall-pack-housing"')
    expect(markup).toContain('name="catalog-wall-pack-top-lid"')
    expect(markup).toContain('name="catalog-wall-pack-diffuser"')
    expect(markup).toContain('name="catalog-wall-pack-neck"')
    expect((markup.match(/name="catalog-lamp-pole"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('spotLight')
  })

  test('builds the tunnel luminaire flush to a grounded soffit', () => {
    const node = parseCatalogLamp('environment:tunnel-luminaire', {
      armLength: 2.2,
      height: 6,
      visualStyle: 'tunnel',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-tunnel-luminaire"')
    expect(markup).toContain('name="catalog-tunnel-soffit"')
    expect(markup).toContain('name="catalog-tunnel-soffit-recess"')
    expect(markup).toContain('name="catalog-tunnel-housing"')
    expect(markup).toContain('name="catalog-tunnel-reflector"')
    expect(markup).toContain('name="catalog-tunnel-diffuser"')
    expect(markup).toContain('name="catalog-tunnel-trim"')
    expect(markup).not.toContain('spotLight')
  })

  test('builds the canopy style as a grounded recessed broad-beam fixture', () => {
    const node = parseCatalogLamp('environment:canopy-soffit-light', {
      armLength: 1,
      height: 6,
      lightOn: false,
      visualStyle: 'canopy',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-canopy-soffit-light"')
    expect(markup).toContain('name="catalog-canopy-support-plate"')
    expect(markup).toContain('name="catalog-canopy-housing"')
    expect(markup).toContain('name="catalog-canopy-recess"')
    expect(markup).toContain('name="catalog-canopy-diffuser"')
    expect(markup).toContain('name="catalog-canopy-trim"')
    expect(markup).toContain('name="catalog-canopy-mount"')
    expect((markup.match(/name="catalog-lamp-pole"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('spotLight')
  })
})
