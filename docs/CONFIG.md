# Config

`.rafters/config.rafters.json` is where the project answers a small set of questions: which framework, where do components live, where do composites live, which export formats. Most of it stays the same across projects. The path fields are where things get interesting.

## One Folder, or Many

Every path field accepts a string. That's the simple case and the default after `rafters init`:

```json
{
  "compositesPath": "src/composites"
}
```

It also accepts an array. That's how a project pulls in assets that don't live inside it:

```json
{
  "compositesPath": ["src/composites", "../shared/composites"]
}
```

The array isn't ordered by preference. It's two answers to the same question -- "where do composites live?" -- and the CLI globs them into one logical folder. Local entries always win on collision.

## What "Local" Means

A folder is local if its real path resolves inside the project directory. That's how the CLI decides which folder receives new installs from `rafters add`. Externals are read-only by definition; you can't add to `node_modules/@shingle/shared/composites`, only borrow from it.

When two folders both qualify -- say `src/composites` and `src/legacy/composites` -- the first one in the array wins. If you need a different one, tag it:

```json
{
  "compositesPath": [
    { "path": "src/legacy/composites", "root": true },
    "src/composites",
    "../shared/composites"
  ]
}
```

`{ "root": true }` overrides position. Otherwise the rules read:

1. Explicit `{ root: true }` wins.
2. Otherwise the first entry that resolves inside the project.
3. Otherwise the framework default at the project root.

## Why It Matters

The reason this shape exists is `@shingle/shared`. The shingle sites -- huttspawn, smugglr, gitpress, sean.silvius.me -- each have their own `.rafters/` install with their own token overrides. Per-site decisions stay per-site. But composites are different. A hero block, a copy-button, an article header -- those should be written once and read by every site.

Multi-folder paths is how that flows. The site declares its own folder plus the shared one. New work lands locally. Shared work flows in by reference. No copy-paste, no per-site forks of the same hero.

## Collisions Are Local Wins

If `@shingle/shared` ships a `feature-grid` composite and the site has a local override at `src/composites/feature-grid.composite.json`, the site's version wins. No apology. The whole point of the read set is that local decisions outrank shared ones.

If the project doesn't want the shared composite at all, removing it from the array is the answer. Don't shadow what you can ignore.

## The Fields

Four path fields share this shape:

- `componentsPath` -- UI components (Button, Card)
- `primitivesPath` -- composition primitives (block-handler, color-picker)
- `compositesPath` -- composite manifests (login-form, hero-banner)
- `rulesPath` -- validation rules (required, email, password)

Each resolves independently. A project can keep components local but pull composites from a shared package, or any other combination. The rules are the same for every field.

## What Stays a String

CSS path stays a string. So does the framework, the dark mode strategy, the export config. Multi-folder is for asset libraries -- things that compose. Configuration that describes the project itself stays singular.
