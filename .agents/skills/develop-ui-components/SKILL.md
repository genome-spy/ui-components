---
name: develop-ui-components
description: >
  Implement, review, or debug GenomeSpy Lit components, shared CSS, and browser
  utilities in the ui-components repository.
---

# Develop GenomeSpy UI Components

- Trace the public entry point in `package.json`, its implementation in `src/`,
  and its Storybook example or tests. Keep data, persistence, and application
  actions in the caller where the caller already owns them.
- Keep class and utility modules side-effect-free at import time. Component
  registration belongs in the matching `src/define/` entry, which package
  metadata marks as a side effect. Place public modules directly under `src/`
  for wildcard exports and place implementation modules under `src/internal/`.
- Prefer native controls. For changes to custom interactions, verify keyboard
  operation, the accessible name, focus return after dismissal, and disabled
  states as applicable. Check focus and overlay behavior in a browser because
  jsdom does not reproduce native dialog or popover behavior.
- Reuse existing `--gs-*` tokens for shared colors, borders, and control states.
  Expose a component-specific token or CSS part when callers need control at
  that boundary. Use the Storybook palette toolbar to check theme inheritance.
- Use colocated Vitest tests for logic and events. Run a focused test while
  iterating, then use the [development checks](../../../README.md#development)
  that cover the change. For exports or registration changes, run the
  packed-consumer check to exercise the npm entry points.
