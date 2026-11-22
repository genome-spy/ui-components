# @genome-spy/ui-components

## 0.1.0

### Minor Changes

- Release GenomeSpy UI Components as a standalone package. It includes reusable
  Lit components for layout, file selection, dialogs, plot image export, menus,
  data previews, job progress, and forms. Apps can import individual controls
  and theme them with scoped CSS custom properties. Storybook shows their APIs
  and usage examples, and the package ships a Custom Elements Manifest for
  tooling.
- Add a `picker` slot to `gs-upload-drop-zone` for custom file pickers. Use the
  `drop-zone` CSS part to style the surface size.
- Let `BaseDialog` subclasses prevent dismissal during pending work. Both footer
  button helpers support `autofocus` for the initial action.
