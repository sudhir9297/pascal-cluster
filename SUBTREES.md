# Plugin Git subtrees

Each plugin is a separate workspace package under `packages/` and keeps its original GitHub repository as an upstream. `git subtree` imports preserve each plugin's commit history. The plugin remotes are configured in this checkout's `.git/config`; add them again after cloning this monorepo.

| Package path | GitHub repository | Imported branch | Remote name |
| --- | --- | --- | --- |
| `packages/landscape` | `sudhir9297/landscape-pascal-plugin` | `main` | `landscape-plugin` |
| `packages/pool` | `sudhir9297/pool-pascal-plugin` | `main` | `pool-plugin` |
| `packages/streetscape` | `sudhir9297/streetscape-pascal-plugin` | `t3code/openstreetmap-data-work` | `streetscape-plugin` |
| `packages/webxr` | `sudhir9297/webxr-pascal-plugin` | `main` | `webxr-plugin` |

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

Replace `pool` and `main` with the package path and upstream branch from the table. To publish package changes back to its GitHub repository, run the corresponding `git subtree push` command, for example:

```sh
git subtree push --prefix=packages/pool pool-plugin main
```

`git subtree push` writes to the configured GitHub repository. Run it when intentionally publishing that package's changes.

Streetscape was imported from the local `t3code/openstreetmap-data-work` branch at `82de862`. At import time it had three commits beyond the GitHub feature branch and `main` had one commit beyond GitHub `main`. Those commits are preserved in this monorepo; publish them by subtree-pushing the Streetscape package to the intended upstream branch.
