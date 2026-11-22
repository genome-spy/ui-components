---
name: document-ui-components
description: >
  Document public GenomeSpy UI component APIs and create practical Storybook
  examples for properties, events, styling, and integration.
---

# Document GenomeSpy UI Components

- Locate the public import and check how callers use it. Update the source JSDoc
  for properties and types and describe public events, slots, parts, and CSS
  properties with the tags used by neighboring components. Include event
  payloads, important defaults, and the caller's responsibilities.
- Use a Storybook example to show the real registration or utility import, the
  minimum useful markup, and how a caller handles the interaction. Use
  Storybook's existing palettes for theming examples and show the tokens callers
  can override on an ancestor.
- Keep installation and shared conventions in the README. Put component-specific
  examples in Storybook and declarations in source. The package overview should
  explain that GenomeSpy apps share these components and that APIs may change.
- Regenerate the Custom Elements Manifest with `npm run build:manifest` and
  inspect the affected declarations. Build Storybook for changes to stories or
  Docs pages. The generated manifest comes from source and is built for npm.
