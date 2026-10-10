# Releasing

1. Update `version` in package.json and the heading in CHANGELOG.md.
2. Run the full checks locally, including the browser tests and, where the samples are
   available, the local acceptance:

   ```sh
   pnpm install --frozen-lockfile
   pnpm test && pnpm test:e2e
   POLYXSLT_PRIVATE=<dir> pnpm verify:private
   ```

3. Run the checks that `npm publish` would run from a workstation (`prepublishOnly`): lint,
   type check, build, size check, and that the reference output and the generated
   documents are current:

   ```sh
   pnpm run prepublishOnly
   ```
4. Commit, tag and build the release files:

   ```sh
   git tag -a v1.0.0 -m 'polyxslt 1.0.0'
   pnpm release
   ```

   `pnpm release` requires a clean working tree with HEAD at the tag `v<version>`, and
   writes to `release/<version>/`:

   | File | Content |
   |---|---|
   | `xslt-polyfill.min.js` (and `.map`) | the auto-mode build, ready to be served as is |
   | `polyxslt.mjs` (and `.map`) | the ESM build |
   | `polyxslt-<version>.tar.xz` | the source of the tag, from `git archive` |
   | `SHA256SUMS` | checksums of the files above |
   | `SRI.txt` | Subresource Integrity hashes of the two builds |

   It also writes `NOTES.md`, the release notes: the CHANGELOG.md section of the version
   followed by `SRI.txt`.

   The source archive is reproducible: the same tag gives the same bytes.
   `pnpm release --snapshot` builds from the current commit without a tag, for trying the
   process out.
5. Push the tag (`git push origin v1.0.0`). The Release workflow
   (.github/workflows/release.yml) runs the lint, type check and unit tests, runs
   `pnpm release`, and creates the GitHub release with the files above and `NOTES.md` as
   its notes; a version with a hyphen, such as `1.1.0-rc.1`, is marked as a pre-release.
   The end-to-end tests are not run again; they have run in CI on the tagged commit.

   The tag rules of the repository do not allow a `v*` tag to be moved or deleted, and a
   failed run cannot be repaired at the same tag. After a change to the workflow, rehearse
   before tagging: run it by hand on the branch (`gh workflow run release.yml --ref main`).
   The rehearsal builds the release files and the npm package of that commit, keeps them
   as artifacts of the run, and publishes nothing.
6. The workflow's `npm` job then publishes the package, built by the release job, on npm.
   If the `npm` environment requires an approval, the job waits for it. A version with a
   hyphen gets the dist-tag `next` instead of `latest`. A version that is already on npm is
   left as it is, so the job can be run again.

## npm setup

The workflow publishes with npm's trusted publishing: the registry accepts the OIDC token
that GitHub issues to the `npm` job, and the repository holds no npm token. The package
gets a provenance statement, which only a supported CI system building from a public
repository can produce; a version published from a workstation has none.

The setup is done once:

- On npmjs.com, in the settings of the package, add a trusted publisher: GitHub Actions,
  user `delphij`, repository `polyxslt`, workflow `release.yml`, environment `npm`. Then
  set the publishing access to require two-factor authentication and disallow tokens.
- On GitHub, in the settings of the repository, create the environment `npm`, limit its
  deployment tags to `v*`, and add a required reviewer if a release should wait for an
  approval.

npm accepts a trusted publisher only for a package that exists, so the first version was
published by hand, with `npm publish` at the release tag.
