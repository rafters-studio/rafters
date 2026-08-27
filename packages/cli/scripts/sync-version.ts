/**
 * Sync every declared version to the CLI package version.
 *
 * npm requires a literal `version` in packages/cli/package.json, so that field
 * is the one that cannot itself be derived -- which makes it the source of
 * truth for the whole artifact. None of the other sites can include a value
 * (package.json, the plugin manifests, and YAML frontmatter all need a
 * literal), so they are written here instead.
 *
 * Runs as a step of the CLI `build` script alongside generate-agent-contract.ts,
 * so a version cannot drift from the bundle shipped beside it: building rewrites
 * every site.
 *
 * Writes are TEXTUAL, never parse-then-stringify: re-emitting JSON reformats
 * unrelated lines (`"args": ["mcp"]` expands to three), which produces noise
 * diffs and fights the formatter. Each file is parsed only to VALIDATE, then
 * edited in place so everything but the version bytes survives untouched.
 *
 * Every check throws rather than skipping. A silently unsynced version is the
 * exact failure this script exists to remove.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '../../..');

/** Matches every `"version": "..."` field, capturing the key and separator. */
const VERSION_FIELD = /("version"\s*:\s*)"[^"]*"/g;

/**
 * A JSON file to sync, and how many `version` fields it is expected to carry.
 * The count is a structural guard: if a manifest gains or loses a version site,
 * this fails loudly instead of silently leaving one stale (or overwriting one
 * that was never meant to track the artifact).
 */
const JSON_TARGETS: ReadonlyArray<{ path: string; versions: number }> = [
  { path: 'plugin/package.json', versions: 1 },
  { path: 'plugin/.claude-plugin/plugin.json', versions: 1 },
  // Once for the marketplace itself, once on the rafters plugin entry.
  { path: '.claude-plugin/marketplace.json', versions: 2 },
  { path: 'packages/math-utils/package.json', versions: 1 },
  { path: 'packages/shared/package.json', versions: 1 },
  { path: 'packages/color-utils/package.json', versions: 1 },
];

const FRONTMATTER_TARGETS: readonly string[] = ['plugin/skills/rafters-frontend/SKILL.md'];

/**
 * A TS source file carrying a version constant rewritten textually. Like the
 * JSON targets, this is a structural guard: the regex must match the
 * declaration exactly once, or the sync is silently wrong.
 */
const CONSTANT_TARGETS: ReadonlyArray<{ path: string; name: string }> = [
  { path: 'packages/shared/src/version.ts', name: 'RAFTERS_VERSION' },
];

function requireString(value: unknown, what: string): string {
  if (typeof value !== 'string') {
    const found = value === undefined ? 'nothing' : typeof value;
    throw new Error(`${what}: expected a string, found ${found}`);
  }
  return value;
}

/** Read a JSON file as text, and parse it once to confirm it is an object. */
async function readValidatedJson(
  path: string,
): Promise<{ text: string; json: Record<string, unknown> }> {
  const text = await readFile(path, 'utf-8');
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path}: expected a JSON object`);
  }
  return { text, json: parsed as Record<string, unknown> };
}

const cliPackage = join(REPO_ROOT, 'packages/cli/package.json');
const version = requireString(
  (await readValidatedJson(cliPackage)).json.version,
  `${cliPackage} version`,
);

for (const { path: relative, versions } of JSON_TARGETS) {
  const path = join(REPO_ROOT, relative);
  const { text, json } = await readValidatedJson(path);
  requireString(json.version, `${relative} version`);

  const found = text.match(VERSION_FIELD)?.length ?? 0;
  if (found !== versions) {
    throw new Error(`${relative}: expected ${versions} version field(s), found ${found}`);
  }

  await writeFile(path, text.replace(VERSION_FIELD, `$1"${version}"`));
}

/**
 * Rewrite `version:` inside a SKILL.md's leading frontmatter block only. An
 * unanchored match would also rewrite the word where it appears in body prose.
 */
for (const relative of FRONTMATTER_TARGETS) {
  const path = join(REPO_ROOT, relative);
  const source = await readFile(path, 'utf-8');

  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!frontmatter?.[1]) {
    throw new Error(`${relative}: no frontmatter block`);
  }
  const block = frontmatter[1];
  if (!/^version: .*$/m.test(block)) {
    throw new Error(`${relative}: frontmatter has no version field`);
  }

  const synced = block.replace(/^version: .*$/m, `version: ${version}`);
  await writeFile(path, `---\n${synced}\n---\n${source.slice(frontmatter[0].length)}`);
}

/**
 * Rewrite a `export const NAME = '...';` literal in a plain TS source file.
 * Unlike the JSON targets there is no structural parse to validate against,
 * so the match count is the only guard: zero or more than one is a failure.
 */
for (const { path: relative, name } of CONSTANT_TARGETS) {
  const path = join(REPO_ROOT, relative);
  const text = await readFile(path, 'utf-8');

  const constantField = new RegExp(`(export const ${name} = )'[^']*'`, 'g');
  const found = text.match(constantField)?.length ?? 0;
  if (found !== 1) {
    throw new Error(`${relative}: expected ${name} exactly once, found ${found}`);
  }

  await writeFile(path, text.replace(constantField, `$1'${version}'`));
}
