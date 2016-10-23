# Dependencies with transitive peerDependencies in conflict resolve incorrectly and silently

TL;DR: transitive dependencies with a peerDependency in conflict can get the wrong version

Take this dependency tree for example:

## Initial dependency tree
```
package
  |
  |--primary-with-peer
  | ||
  | ||==[peerDependency]== peer@2.0.0
  |--primary-with-transitive-peer
    |
    |--transitive-with-peer
      ||
      ||==[peerDependency]== peer@1.0.0
```

## Resolved peers
```
package
  |
  |--primary-with-peer
  |--peer@2.0.0 (satisfies peerDep of primary-with-peer)
  |--primary-with-transitive-peer
    |--transitive-with-peer
    |--peer@1.0.0 (satisfies peerDep of transitive-with-peer)
```

## Installed
```
package
  |
  |--primary-with-peer
  |--peer@2.0.0
  |--primary-with-transitive-peer
  | |--peer@1.0.0
  |--transitive-with-peer **finds v2.0.0 instead of intended v1.0.0**
```

For a working example, clone this repo and run `npm install` inside the `package` directory.

Then, open the repl and require the `package` module:

```
$ node
> require('./package')
{ name: 'package',
  version: '1.0.0',
  'primary-with-peer':
   { name: 'primary-with-peer',
     version: '1.0.0',
     peer: { name: 'peer', version: '2.0.0' } },
  'transitive-with-peer':
   { name: 'transitive-with-peer',
     version: '1.0.0',
     peer: { name: 'peer', version: '2.0.0' } } }
```


With all peerDependencies installed as directed, note that both `primary-with-peer` and `transitive-with-peer` get the same version of `peer` rather than the distinct versions specified in their respective `package.json` files.

In more detail:

In npm@2, all of a package's dependencies would be installed in the package's `node_modules` folder, peerDependencies included.

In npm@3 the install behavior changed to install maximally flat (horray!) *and* to not install peerDependencies by default, allowing the package developer to manage peerDependency versions explicitly (and manually).

When two package dependency versions conflict, the first dependency encountered by the cli will be installed directly in the `node_modules` folder. All subsequent conflicting versions will be installed in their respective requestor's `node_modules` folders maximally flat.

This means that the transitive dependency is installed alongside an incompatible version of its peerDependency. When the transitive dependency attempts to require its peer, it instead gets an unintended and semver-incompatible version.

In the case where a package has conflicting peerDependencies, there does not appear to be a reconciliation algorithm to ensure that transitive dependencies will be able to access their intended peer. In addition, beyond the warning on `npm install` or `npm ls`, any errors or discrepancies would arise at runtime, possibly in the form of subtle bugs or mangled data.


Seems like the options would be:

1: install transitive deps adjacent to their matching peers when a peer is in conflict (algorithm and additional code complexity, but a reasonable measure of backwards compatibility)
2: officially deprecate support peerDeps of transitive deps (docs update and error message on installation)
3: something else?



As a side note, it also appears that the error message for the transitive peer could be improved. Right now it appears like this:

```
$ npm install
package@1.0.0 /Users/jvivian/code/deeplink/npm-peer-dependency-bug/package
├── peer@2.0.0
├── primary-with-peer@1.0.0
└─┬ primary-with-transitive-peer@1.0.0
  ├── UNMET PEER DEPENDENCY peer@1.0.0
  └── transitive-with-peer@1.0.0
```

It correctly identifies `peer@1.0.0` as the problematic peer, but doesn't clearly represent the mismatch in the dependency tree or how the peer dep is unmet.
