# RFC: Provenance fingerprint for published items

- Status: DRAFT, veneer-reviewed, ratify-ready. Sean ratifies.
- Origin: Sean + veneer, 2026-07-09. Veneer's sidecar delta is a stateless
  compare against this signature; the format is the seam.

## The problem

Copy-in distribution loses identity at install. Once a component lands in a
consumer's tree, nothing can say whether it is the supplied artifact, a
consumer modification, or stale. Boundary 1 demands traceability; nothing
enforces it.

## The mechanism

At publish, the pipeline stamps two JSDoc tags into each supplied file:

```
@rafters-provenance <name>@<version>
@rafters-fingerprint sha256:<hash> ed25519:<sig> key=<id>
```

`key=<id>` names the signing key. One key exists today; the token is v1
grammar so rotation is a data change, never a format migration.

- **Hash**: sha256 over the file bytes with the `@rafters-fingerprint` line
  removed. Exact-line strip; deterministic; same pattern as signed commits.
- **Signature**: ed25519 over the hash, rafters publish key. The public key
  ships in the CLI and veneer.

Identity travels with the file. No lockfile required for verification.

## The consumer algorithm (veneer's four steps)

1. No tag: consumer-authored. Done.
2. Tag present: strip the fingerprint line, hash, compare. Mismatch:
   "modified from `<name>@<version>`" — ancestry known, divergence honest.
3. Hash matches: verify the signature against the bundled public key.
4. Signature clean: rafters-pristine. Staleness is a LOCAL compare: the
   tag's `@version` against the installed rafters version on disk. Never a
   network fetch — sidecar consumers (veneer, FR-VEN-021) cannot make one.

Offline, stateless, per-file. The consumer's verdict is a tri-state per
file — authored (no tag) / modified (hash mismatch, ancestry known) /
pristine (signature verifies) — plus the version. Consumers surface the
tri-state, not a boolean: "modified" may be formatter-only.

## Why the signature is not optional

A bare self-consistent hash is spoofable: any generator can stamp a matching
fingerprint and be documented as rafters-supplied. Only the publish key
signs. "Rafters-pristine" becomes a claim nobody else can mint.

## Scope

- Components, primitives, composites, rules — anything the registry serves.
- Registry item JSON additionally records an item-level fingerprint: sha256
  of the sorted per-file hashes. Item verdict aggregation: an item is
  pristine iff ALL its files verify; modified if ANY mismatches. The
  item-level fingerprint is the whole-item check.
- Workspace-local unpublished composites: unsigned in v1. They keep
  `provenance {composedBy, ratified}` from the compose design; the signature
  applies at publish only.
- The component matrix line carries an optional `provenance {version,
  fingerprint, signature}` block (ComponentLineSchema), filled at publish.

## Honest limits

- Any byte drift is "modified" — including a consumer formatter rewrapping
  the JSDoc. True, but noisy. Byte-honest ships first; a normalized
  comparison tier is added only if real projects drown in formatter noise.
- The signature proves origin, not quality, and not fitness of the version.
- Key rotation: tags carry no key id in v1; rotation invalidates old sigs.
  Acceptable while there is one key. Add `key=<id>` before there are two.

## Line-shape reconciliation (veneer, FR-VEN-031)

- Both sides carry a per-line `schema` discriminator: rafters lines are
  `rafters.component-line/1`; veneer's are `veneer.doc/1`, `veneer.index/1`.
  Landed in ComponentLineSchema 2026-07-10.
- Veneer's index line gains the same optional provenance block, read from
  the file tags at extract time.

## Key custody

The public key ships WITH the installed rafters package (readable on disk),
not hardcoded in any consumer binary — rotation updates the package, and
consumers pick it up without their own release. Who can invoke publish
(private-key custody) is Sean's ruling.

## Open for co-review

1. Tag grammar final form (one line vs two; attribute order).
2. Publish invocation / private-key custody (Sean).
3. Whether `rafters update` uses the lockfile convenience (per-install
   record) or tags alone.

## Review record

- veneer 2026-07-10 (bullpen 019f4a71): ratify-ready with four flags — all
  four absorbed above (local staleness, key=<id> in v1, tri-state verdict,
  all-files aggregation confirmed).
