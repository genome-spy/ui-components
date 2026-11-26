# Contribute to UI Components

Use `npm ci` and `npm run check` to verify changes locally. For component
behavior, also check the relevant Storybook story. Pull request CI checks the
packed package's types/build and builds Storybook without installing or
launching a browser. Browser acceptance runs only when CI is started manually
with `browser_tests=true` (default false).

For a change that affects package consumers, run `npm run changeset` and commit
the generated fragment with the change. During 0.x development, choose a patch
for a compatible fix and a minor for new functionality or a breaking change.
Include migration instructions for breaking changes. Internal tooling and test
changes can merge without a fragment.

## Releases

When changesets reach `main`, **Release PR** opens or updates a PR with the new
version, lockfile, and `CHANGELOG.md`. Enable **Allow GitHub Actions to create
and approve pull requests** in **Settings → Actions → General** so GitHub can
open it. Use `npm run release:status` to preview pending versions locally.
Review and merge the release PR before publishing.

### npm setup and publication

The workflows and package metadata target `genome-spy/ui-components`. For an
unpublished package, a maintainer with access to the scope must publish the
first reviewed version with `npm publish` from its release commit using an
authenticated npm session with 2FA. The package has to exist before npm accepts
a trusted publisher configuration.
[npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/#prerequisites)

In the package's npm settings, add a **GitHub Actions** trusted publisher for
organization `genome-spy`, repository `ui-components`, and workflow
`publish.yml`. Leave the environment field empty and enable direct
`npm publish`. Configure it when a release is ready since npm expires a new
connection that has yet to publish after two days.
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

For later releases, run **Publish to npm** on `main` and enter the reviewed
version. The workflow checks the version and changelog and publishes through
OIDC. Before dispatching, verify that CI passed for the release commit.

### Package previews

Install the [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new) on the
public repository. In **Actions → Publish UI Components preview**, run the
workflow on the branch you want to test. The run summary gives you an install
command for that commit. Preview versions are separate from npm releases.

## Storybook on GitHub Pages

Select **GitHub Actions** under **Settings → Pages → Build and deployment**.
**Storybook Pages** then builds and deploys `build/storybook` on pushes to
`main`. Run it manually from `main` for the initial deployment if the source
setting was enabled after the first push. GitHub Actions shows the live URL on
the deployment.
[GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
