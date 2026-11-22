---
name: prepare-ui-components-pr
description: >
  Prepare or review changes for a UI Components pull request and write its
  title, description, review findings, or replies.
---

# Prepare a UI Components pull request

- Read the diff against the intended base. Check effects on public imports,
  events, theme tokens, and the apps that use them. State any migration steps
  when a caller needs to change.
- When preparing a change visible to npm consumers, add a Changesets fragment
  with `npm run changeset`. Describe the observable change and choose a bump
  that matches its compatibility. Internal tooling and test changes can merge
  without a fragment. See the
  [release process](../../../CONTRIBUTING.md#releases).
- Use a Conventional Commit-style title. Lead the description with the problem
  and the behavior the PR delivers. Describe why relevant design choices matter
  to reviewers instead of listing files.
- Report what verification covered and name any important gaps. Distinguish
  local checks from GitHub Actions results. In reviews, cite the line and
  describe a concrete failure or risk the author can address.
- When authorized to post agent-authored PR bodies, reviews, or comments, end
  the post with `_Posted by <agent name> (AI agent) at the user's request._`.
