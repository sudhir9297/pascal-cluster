import type { NodeDefinition } from '@pascal-app/core'
import { DeckNode, DECK_KIND } from './domain/schema'
import { buildDeckGeometry, buildDeckFloorplan } from './rendering/geometry'
import { drawingModeHint } from '../shared/drawing-mode'
import { surfaceFloorplanAffordances } from '../shared/floorplan-affordances'
import { deckParametrics } from './editor/parametrics'
import { deckPaint } from './editor/paint'
import { deckMinimumHeight } from './domain/settings'
import { surfaceHeightHandle } from '../shared/height-handle'

export const deckDefinition: NodeDefinition<typeof DeckNode> = {
  kind: DECK_KIND,
  schemaVersion: 1,
  schema: DeckNode,
  category: 'site',
  snapProfile: 'item',
  surfaceRole: 'floor',
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = DeckNode.parse({})
    return defaults
  },
  capabilities: {
    selectable: { hitVolume: 'mesh' },
    paint: deckPaint,
    movable: { axes: ['x', 'z'], gridSnap: true },
    rotatable: { axes: ['y'] },
    duplicable: true,
    deletable: true,
  },
  geometry: buildDeckGeometry,
  system: { module: () => import('./editor/boundary-system') },
  floorplan: buildDeckFloorplan,
  floorplanAffordances: surfaceFloorplanAffordances(DECK_KIND),
  tool: () => import('../shared/drawing-tool'),
  preview: () => import('../shared/preview'),
  parametrics: deckParametrics,
  handles: [surfaceHeightHandle<DeckNode>(deckMinimumHeight)],
  toolHints: [{ key: 'Click / drag', label: 'Draw deck' }, drawingModeHint(DECK_KIND),
    { key: 'Enter', label: 'Finish outline' }, { key: 'Esc', label: 'Cancel' }],
  presentation: { label: 'Deck', description: 'Draw a rectangular, custom, freehand, circular, or oval deck and paint its surfaces.', icon: { kind: 'iconify', name: 'lucide:panels-top-left' }, paletteSection: 'site', hidden: true },
  mcp: { description: 'A low or raised deck with editable boards, border, fascia, frame, supports, and skirting.' },
}
