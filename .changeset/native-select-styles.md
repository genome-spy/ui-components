---
"@genome-spy/ui-components": minor
---

Replace NativeSelect with opt-in `nativeSelectStyles` for
`select.gs-native-select`. The styles are independent of formStyles and have no
registration/document effects.

Remove the `NativeSelect` root export, `nativeSelect` module and
`define/nativeSelect` registration. Migrate to a labelled HTML select with
option children and a standard change handler reading
`event.currentTarget.value` instead of `event.detail.value`. Property
assignments remain silent, and native FormData and validation are available. For
long labels, include button/selectedcontent and the optional style class;
unsupported browsers retain the platform picker.
