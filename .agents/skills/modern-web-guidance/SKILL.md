---
name: modern-web-guidance
description: >
  Consult Chrome's Modern Web Guidance when choosing browser APIs or changing
  accessible web components, CSS, dialogs, menus, forms, or focus behavior.
---

# Modern Web Guidance

For changes to browser interactions or CSS behavior, consult Chrome's
[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance)
before choosing a platform feature. Search for one browser behavior at a time.
For example, find the guide for a dialog that closes on outside click.

```sh
npx modern-web-guidance@latest search "light dismiss dialog"
npx modern-web-guidance@latest retrieve "light-dismiss-a-dialog"
```

Retrieve the guide ID from the search results. The
[guide catalogue](https://developer.chrome.com/docs/modern-web-guidance/guides)
is available directly when the CLI is unavailable.

Check the guide's Baseline and fallback notes against the browsers the component
serves. Adapt the markup and event wiring to Lit and scoped `--gs-*` tokens.
Verify the applicable behavior in the component's Storybook story or in a
focused browser test.
