---
name: prepare-ui-components-release
description: >
  Prepare or verify an npm release or package preview of
  @genome-spy/ui-components from the standalone repository.
---

# Prepare a UI Components release

- Review the changes since the last published version for changes to imports,
  types, events, and CSS contracts. Check the npm registry for published
  versions when choosing a release version. The standalone package versions
  independently of GenomeSpy Core and App.
- Use `npm run release:status` to preview the pending Changesets. The release PR
  uses `npm run release:version` to consume them and update the changelog,
  manifest, and lockfile. See the
  [release process](../../../CONTRIBUTING.md#releases).
- Run the [development checks](../../../README.md#development). Use
  `npm pack --dry-run --json` to inspect the files npm will include and
  `npm run test:packed-consumer` to verify the tarball through strict
  TypeScript, Vite, and Chromium.
- Check that advertised entry points resolve, that declarations and the Custom
  Elements Manifest are in the tarball, and that styles and `define/`
  registration modules preserve their `sideEffects` entries. Tests and Storybook
  are development assets.
- When the user authorizes publication, run the **Publish to npm** workflow on
  `main` with the reviewed version. For a first release, follow the registry
  bootstrap in the release process. Downstream apps can pin the published
  version using the same package name and import paths.
