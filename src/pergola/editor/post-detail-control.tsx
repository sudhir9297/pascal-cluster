'use client'
import type { PergolaNode } from '../domain/schema'
import {
  POST_DETAIL_OPTIONS,
  validPostDetailStyle,
} from '../domain/post-details'

export function PostDetailControl({
  node,
  onUpdate,
}: {
  node: PergolaNode
  onUpdate: (patch: Partial<PergolaNode>) => void
}) {
  const choices = POST_DETAIL_OPTIONS[node.postStyle ?? 'square']
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <span>Post detail</span>
      <select
        aria-label="Post detail"
        value={validPostDetailStyle(node)}
        onChange={(event) =>
          onUpdate({
            postDetailStyle: event.target
              .value as PergolaNode['postDetailStyle'],
          })
        }
        style={{
          maxWidth: 150,
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '5px 7px',
          background: 'var(--background)',
          color: 'inherit',
        }}
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  )
}
