# Releasing

npm publishing is manual. GitHub Actions only builds and deploys the documentation from [`.github/workflows/docs.yml`](.github/workflows/docs.yml); no workflow publishes to npm or holds an npm token.

## One-time setup

Confirm you can publish the unscoped package name:

```bash
npm view vue-syntax-highlighter version
```

A `404` means the name is available. If the query succeeds, the package already exists and its owner must add you as a maintainer before publishing.

Sign in locally and enable two-factor authentication:

```bash
npm login
npm whoami
```

## Release checklist

1. Start from a clean, up-to-date `main`:

   ```bash
   git switch main
   git pull
   git status
   ```

2. Add or move the changelog entry under `## [x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`.

3. Run the full gate:

   ```bash
   pnpm install --frozen-lockfile
   pnpm verify
   ```

4. Confirm the release tag matches the package version:

   ```bash
   pnpm check:release vX.Y.Z
   ```

5. Publish manually and enter the npm one-time password when prompted:

   ```bash
   npm publish --access public
   ```

   `prepublishOnly` rebuilds the package and runs `check:package` before upload. Use `npm publish --dry-run` to inspect the tarball without uploading. If OTP timing is tight, run `pnpm build && pnpm check:package` first, then `npm publish --access public --ignore-scripts` and enter the code.

6. Verify the registry:

   ```bash
   npm view vue-syntax-highlighter version
   npm view vue-syntax-highlighter dist-tags
   npm view vue-syntax-highlighter repository.url
   ```

7. Create and push the release tag for history:

   ```bash
   git tag -a vX.Y.Z -m "vue-syntax-highlighter X.Y.Z"
   git push origin main
   git push origin vX.Y.Z
   ```

   The tag does not trigger an npm publish. Pushing `main` deploys the docs.

## If npm uses staged publishing

A staged release is not public until a maintainer approves it. Open the package's **Staged Packages** tab on npmjs.com, review the version, and choose **Approve** with 2FA. With npm CLI 11.15.0 or newer:

```bash
npx --yes npm@11.15.0 stage list
npx --yes npm@11.15.0 stage approve <stage-id>
```

## After a bad release

- Deprecate a broken version without removing it:

  ```bash
  npm deprecate vue-syntax-highlighter@X.Y.Z "Use X.Y.(Z+1) or newer"
  ```

- Move the `latest` dist-tag to a known-good version:

  ```bash
  npm dist-tag add vue-syntax-highlighter@X.Y.Z latest
  ```

- Unpublish only if the release is less than 72 hours old, has no dependents, and the version must not exist:

  ```bash
  npm unpublish vue-syntax-highlighter@X.Y.Z
  ```

  Prefer a patch release and `npm deprecate`; unpublishing breaks lockfiles and caches.

## Documentation

The docs site deploys from [`.github/workflows/docs.yml`](.github/workflows/docs.yml) on every push to `main`. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. The site is published at:

- Project page: `https://coderminer.github.io/vue-syntax-highlighter/`
- The workflow sets `DOCS_BASE` to `/<repository>/` automatically.
