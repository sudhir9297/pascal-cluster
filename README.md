# Pascal Landscape plugin

Landscape design tools for the Pascal editor. This starter exports
`landscapePlugin` and `landscapeHostPanel`; the panel currently has no tools.
Requires Pascal core 1.0.1 or a compatible 1.x release.

## Local development

Install dependencies in this repository and in the editor checkout once. Then,
from this repository:

```bash
bun run dev
```

This links the source into the neighboring `../editor` checkout, rebuilds its
built-in node packages, and starts the editor at http://localhost:3004. Source
edits update through Next.js Fast Refresh. React and Pascal core resolve to the
host's copies.

The link changes only `node_modules`. It does not edit the editor's dependency
URL or lockfile and requires no global Bun link registration.

To link without starting another server:

```bash
bun run dev:link
```

Restart an already running editor after switching between local and installed
packages. Subsequent source edits hot reload without restarting.

Optional settings:

```bash
PASCAL_EDITOR_PATH=/path/to/editor PORT=3004 bun run dev
```

In an existing scene, open **Plugins → Landscape → Install**, then select
**Landscape** in the sidebar.

## GitHub installation

Push this repository to your intended GitHub repository. In the editor's
`apps/editor/package.json`, set the dependency to its URL and a release tag or
commit, for example:

```json
"@pascal-app/plugin-landscape": "github:sudhir9297/landscape-pascal-plugin#COMMIT_OR_TAG"
```

Run `bun install` from the editor root and restart the editor. Its existing
plugin registration, TypeScript transpilation, CSS scanning, and package
resolution work with either an installed dependency or the local development
link. No source-path or Next.js configuration edits are needed when switching.

The package ships TypeScript source at `src/index.ts`, including its lazy panel
imports. No generated `dist` directory, build hooks, or consumer-side build step
is needed in this editor. A different host must transpile this source package
and register its manifest and panel as described in the
[Pascal plugin guide](https://editor.pascal.app/docs/developers/plugins).

To return from local development to the editor's pinned GitHub version:

```bash
bun run dev:unlink
```

This removes the local override and reinstalls from the editor's frozen lockfile.
Restart the editor afterward. To resume local work, run `bun run dev` again.

A GitHub push does not update a pinned installation automatically. To deploy a
new release, update the tag/commit in the editor dependency, run `bun install`,
and commit its package manifest and lockfile.

## Checks

```bash
bun run check-types
bun test
bun pm pack --dry-run
```

## License

MIT
