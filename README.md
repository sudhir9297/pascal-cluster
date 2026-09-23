# Pascal Landscape plugin

A clean starting point for landscape design tools in the Pascal editor. The
plugin manifest and editor panel are ready for landscape node kinds and tools to
be added.

```bash
bun install
bun run check-types
bun test
```

## Plugin entry points

- `landscapePlugin` is the core plugin manifest exported from `src/index.ts`.
- `landscapeHostPanel` registers the Landscape panel in the editor.
- `src/landscape-panel.tsx` is the initial panel component.

The package currently contains no inherited plant node kinds or procedural
vegetation dependencies.

See [Create a plugin](https://editor.pascal.app/docs/developers/plugins) for the
Pascal plugin API and host integration contract.

## License

MIT
