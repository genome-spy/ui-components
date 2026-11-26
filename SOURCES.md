# Migrated component sources

Focused-app presentation originates from `genomespy-apps` checkpoint `263bdf91`:
workspace layout, toolbar, sidebar, entry, Home, native select and reusable
bookmark menu/form helpers. Cell Annotator and Sequence Designer are the two
existing consumers. Implementations follow this package's JavaScript/JSDoc and
explicit registration conventions. No scientific code, state, persistence, model
or action contracts are transferred. Complete history/bookmark cards remain
app-owned.

The new components use the existing public form/dialog styles and theme tokens.
Published style definitions are unchanged. No private app palette, toolbar skin
or new style export is promoted. Retained component CSS owns layout, resize
bounds, clipping and responsive slot placement. NativeSelect exposes the new
`gs-native-select` tag and composed `change` event with `detail.value`; other
focused-app tags/events retain their `gsa-*` names for existing consumers.

`assets/bowtie.svg` is unchanged; its notice is in `licenses/genome-spy.txt`.
App-specific icons and their notices remain in the owning apps. Existing layout
behavior scenarios run against the packed consumer. Apps retain workflow checks
and the legacy selector bridge check. User direction during migration made UI
Components' existing styles authoritative rather than copying app skins here.

## Native select styles

`nativeSelectStyles.js` retains the former NativeSelect's bounded picker and
label layout as class-scoped optional Lit CSS. Existing form styles are
unchanged. The wrapper, its registration and public option type are removed;
callers own native labels, options, standard change events and FormData. The
packed consumer retains the picker/keyboard/placeholder regression cases against
actual native markup, including silent restoration and changed option labels.
