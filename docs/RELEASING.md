# Releasing

1. Update `version` in package.json and the heading in CHANGELOG.md.
2. Run the full checks locally, including the browser tests and, where the samples are
   available, the local acceptance:

   ```sh
   pnpm install --frozen-lockfile
   pnpm test && pnpm test:e2e
   POLYXSLT_PRIVATE=<dir> pnpm verify:private
   ```

3. For npm, `npm publish` runs `prepublishOnly`: lint, type check, build, size check, and
   the checks that the reference output and the generated documents are current.
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
   The browser tests are not run again; they have run in CI on the tagged commit.
   If the package is also on npm, add the jsDelivr URL of the auto-mode build to the
   notes, for example `https://cdn.jsdelivr.net/npm/polyxslt@1.0.0/dist/xslt-polyfill.min.js`.

npm provenance statements can only be produced by a supported CI system (GitHub Actions or
GitLab CI/CD) building from a public repository; a package published from a workstation or
another server has none.
