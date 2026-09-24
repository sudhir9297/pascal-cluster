'use client'
import { useEffect, useRef, useState } from 'react'
import { useEditor } from '@pascal-app/editor'
import { PergolaPanel } from './pergola/editor/panel'
import { PergolaIllustration } from './pergola/editor/illustration'
import { PathwayPanel } from './pathways/editor/panel'
import { PathwayIllustration } from './pathways/editor/illustration'
import { GroundAreaPanel } from './ground-areas/editor/panel'
import { GroundAreaIllustration } from './ground-areas/editor/illustration'
import { CatalogCard } from './editor/catalog-card'

export default function LandscapePanel() {
  const [menu, setMenu] = useState<'root' | 'pergola' | 'pathway' | 'ground-area'>('root')
  const content = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [menu])
  const back = () => {
    const editor = useEditor.getState()
    if (
      editor.tool === 'landscape:pergola' ||
      editor.tool === 'landscape:pathway' ||
      editor.tool === 'landscape:ground-area'
    )
      editor.setTool(null)
    setMenu('root')
  }
  return (
    <section
      aria-label="Landscape"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--foreground)',
        fontSize: 13,
      }}
    >
      <header
        style={{
          padding: 16,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {menu !== 'root' && (
          <button
            type="button"
            onClick={back}
            aria-label="Back to landscape catalog"
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              padding: '0 0 12px',
            }}
          >
            ← Landscape catalog
          </button>
        )}
        <h2
          ref={heading}
          tabIndex={-1}
          style={{ fontSize: 17, fontWeight: 600, margin: 0 }}
        >
          {menu === 'root'
            ? 'Landscape'
            : menu === 'pergola'
              ? 'Pergolas'
              : menu === 'pathway'
                ? 'Pathways & walkways'
                : 'Ground areas'}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: 'var(--muted-foreground)',
            margin: '6px 0 0',
          }}
        >
          {menu === 'root'
            ? 'Choose an item to place in the scene.'
            : menu === 'pathway'
              ? 'Choose a drawing preset. Select a walkway for its floating settings.'
            : menu === 'ground-area'
              ? 'Choose a surface and shape, then draw it on the selected level.'
              : 'Choose a pergola to place in the scene.'}
        </p>
      </header>
      <div
        ref={content}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          padding: 16,
        }}
      >
        {menu === 'root' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
              gap: 8,
            }}
          >
            <CatalogCard label="Pergolas" onClick={() => setMenu('pergola')}>
              <PergolaIllustration roofForm="curved" />
            </CatalogCard>
            <CatalogCard
              label="Pathways & walkways"
              onClick={() => setMenu('pathway')}
            >
              <PathwayIllustration />
            </CatalogCard>
            <CatalogCard label="Ground areas" onClick={() => setMenu('ground-area')}>
              <GroundAreaIllustration />
            </CatalogCard>
          </div>
        )}
        <div hidden={menu !== 'pergola'}>
          <PergolaPanel />
        </div>
        <div hidden={menu !== 'pathway'}>
          <PathwayPanel />
        </div>
        <div hidden={menu !== 'ground-area'}>
          <GroundAreaPanel />
        </div>
      </div>
    </section>
  )
}
