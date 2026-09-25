# Plugin Git subtrees

Each plugin is a separate workspace package under `packages/` and keeps its original GitHub repository as an upstream. `git subtree` imports preserve each plugin's commit history. The plugin remotes are configured in this checkout's `.git/config`; add them again after cloning this monorepo.

| Package path | GitHub repository | Imported branch | Sync branch | Remote name |
| --- | --- | --- | --- | --- |
| `packages/landscape` | `sudhir9297/landscape-pascal-plugin` | `main` | `main` | `landscape-plugin` |
| `packages/pool` | `sudhir9297/pool-pascal-plugin` | `main` | `main` | `pool-plugin` |
| `packages/streetscape` | `sudhir9297/streetscape-pascal-plugin` | `t3code/openstreetmap-data-work` | `main` | `streetscape-plugin` |
| `packages/webxr` | `sudhir9297/webxr-pascal-plugin` | `main` | `main` | `webxr-plugin` |

Recreate the upstream remotes after cloning:

```sh
git remote add landscape-plugin git@github.com:sudhir9297/landscape-pascal-plugin.git
git remote add pool-plugin git@github.com:sudhir9297/pool-pascal-plugin.git
git remote add streetscape-plugin git@github.com:sudhir9297/streetscape-pascal-plugin.git
git remote add webxr-plugin git@github.com:sudhir9297/webxr-pascal-plugin.git
```

Pull upstream updates into a package without flattening its history:

```sh
git subtree pull --prefix=packages/pool pool-plugin main
```

Replace `pool` and `main` with the package path and sync branch from the table. To publish package changes back to its GitHub repository, run the corresponding `git subtree push` command, for example:

```sh
git subtree push --prefix=packages/pool pool-plugin main
```

`git subtree push` writes to the configured GitHub repository. Run it when intentionally publishing that package's changes.

Streetscape was imported from the local `t3code/openstreetmap-data-work` branch at `82de862`. The three Streetscape commits beyond the GitHub feature branch have now been pushed to that upstream feature branch. The imported history includes upstream `main`; pulling `main` into `packages/streetscape` therefore reports "Already up to date." Use `main` for future subtree pulls and pushes. The imported branch remains in the subtree history and can still be accessed through its upstream feature branch.
