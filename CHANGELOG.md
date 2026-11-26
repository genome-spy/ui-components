# @genome-spy/ui-components

## 0.3.0

### Minor Changes

- 66494ac: Add focused-app shell, toolbar, task sidebar, entry and Home
  presentation, retaining existing `gsa-*` tags/events and explicit
  registration. Reuse the published form and context-menu styles without
  changing them or adding an app palette. Shared bookmark menu/form helpers
  remain presentation-only; apps own saved data and commands.
- 66494ac: Add a native select with typed ID/label options, hidden placeholders,
  disabled states and bounded long labels. Keep native keyboard behavior and the
  platform picker fallback; registration is explicit through
  `define/nativeSelect`.

## 0.2.0

### Minor Changes

- 58fbe6d: Support labeled MultiSelect chips, optional suggestion details, and
  keeping the query after selecting an option. Keep catalogue selections
  restricted when pasting and preserve native text editing and popup dismissal.
  Wait for starting suggestions and position the popup before showing it on
  focus. Show optional match and catalogue counts in the suggestion footer.
- 233c8c3: Add `<gs-dialog>` for app-owned forms and controls. It supports modal
  and nonmodal opening, slotted forms with `method="dialog"`, and a dismissal
  guard for pending actions. Use `dialogLayoutStyles` from `/styles` to share
  the `BaseDialog` header, body, and action styles with a slotted form.

### Patch Changes

- 56e5337: Position MultiSelect suggestions with CSS anchors in supporting
  browsers, with Floating UI as a fallback.
- 9000f93: Clear the MultiSelect search field when Escape dismisses suggestions,
  while preserving the selected chips.

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
