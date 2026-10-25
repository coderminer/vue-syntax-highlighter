# Releasing

This project publishes `vue-syntax-highlighter` to npm from GitHub Actions when a `v*` tag is pushed. The workflow is [`.github/workflows/release.yml`](.github/workflows/release.yml).

## One-time setup

### npm package

1. Confirm you can publish the unscoped package name:

   ```bash
   npm view vue-syntax-highlighter version
   ```

   A `404` means the name is available. If the query succeeds, the package already exists and its owner must add you as a maintainer before the first release.

2. Sign in locally and enable two-factor authentication:

   ```bash
   npm login
   npm whoami
   ```

### GitHub

Choose one authentication method for the publish workflow:

- **Granular access token (default in this repository).** Create an npm automation token that can publish `vue-syntax-highlighter`, then add it as the `NPM_TOKEN` repository secret under **Settings → Secrets and variables → Actions**.
- **Trusted publishing (no long-lived token).** On npmjs.com open the package settings, add a trusted publisher for GitHub Actions, and set the repository and workflow name to `release.yml`. Then delete the `NODE_AUTH_TOKEN` environment variable from the publish step so npm uses the workflow's OIDC identity. This requires npm 11.5.1 or newer.

`--provenance` is enabled in the workflow, so the published tarball is linked to the commit and workflow run. The `repository` field in `package.json` must keep pointing at this GitHub repository or npm rejects the provenance attestation.

## Release checklist

1. Start from a clean, up-to-date `main`:

   ```bash
   git switch main
   git pull
   git status
   ```

2. Move the changelog entry out of the previous release and add the new version under `## [x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`.

3. Run the full gate:

   ```bash
   pnpm install --frozen-lockfile
   pnpm verify
   ```

4. Bump the version and create the tag:

   ```bash
   npm version patch   # or minor / major
   git push origin main
   git push origin --tags
   ```

   `npm version` refuses to run outside a clean tree and creates a commit plus an annotated `vx.y.z` tag.

5. Watch the **Publish to npm** workflow. It checks that the tag matches `package.json`, builds, typechecks, tests, verifies size budgets and the packed artifact, then publishes with provenance.

6. Verify the result:

   ```bash
   npm view vue-syntax-highlighter version
   npm view vue-syntax-highlighter dist-tags
   npm view vue-syntax-highlighter repository.url
   ```

   The npm package page shows a provenance badge for the release.

## Manual publishing

If the workflow is unavailable, publish from a machine with npm credentials:

```bash
pnpm install --frozen-lockfile
pnpm verify
npm publish --provenance --access public
```

`prepublishOnly` rebuilds and re-runs the package checks before upload. Use `npm publish --dry-run` to inspect the tarball without uploading. Provenance is only generated in a supported CI environment; omit `--provenance` for a local emergency release.

## After a bad release

- Deprecate a broken version without removing it:

  ```bash
  npm deprecate vue-syntax-highlighter@0.1.0 "Use 0.1.1 or newer"
  ```

- Move the `latest` dist-tag to a known-good version:

  ```bash
  npm dist-tag add vue-syntax-highlighter@0.1.1 latest
  ```

- Unpublish only if the release is less than 72 hours old, has no dependents, and the version must not exist:

  ```bash
  npm unpublish vue-syntax-highlighter@0.1.0
  ```

  Prefer a patch release and `npm deprecate`; unpublishing breaks lockfiles and caches.

## Documentation

The docs site deploys separately from [`.github/workflows/docs.yml`](.github/workflows/docs.yml) on every push to `main`. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. The site is published at:

- Project page: `https://coderminer.github.io/vue-syntax-highlighter/`
- The workflow sets `DOCS_BASE` to `/<repository>/` automatically.

Add the npm version badge to the README after the first successful publish if it is not already present.
