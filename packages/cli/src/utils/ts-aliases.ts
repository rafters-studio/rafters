/**
 * The import aliases a project declares in tsconfig.json or jsconfig.json
 * (`compilerOptions.paths` and `baseUrl`, following a relative `extends`), as a
 * function from an import specifier to the project paths (relative to the
 * project root, no extension) it can name. `remove` uses it to see which files
 * the project's own code imports.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const ConfigSchema = z.object({
  extends: z.string().optional(),
  compilerOptions: z
    .object({
      baseUrl: z.string().optional(),
      paths: z.record(z.string(), z.array(z.string())).optional(),
    })
    .optional(),
});

interface Aliases {
  /** The directory `paths` targets resolve against, relative to the project root. */
  base: string;
  /** The `baseUrl` directory, when the config sets one: bare specifiers resolve there. */
  baseUrl: string | undefined;
  paths: Record<string, string[]>;
}

/** tsconfig is JSONC: drop comments (outside strings) and trailing commas before parsing. */
function parseJsonc(text: string): unknown {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    const next = text.charAt(i + 1);
    if (ch === '"') {
      let end = i + 1;
      while (end < text.length && text.charAt(end) !== '"')
        end += text.charAt(end) === '\\' ? 2 : 1;
      out += text.slice(i, end + 1);
      i = end;
    } else if (ch === '/' && next === '/') {
      while (i < text.length && text.charAt(i) !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      out += ch;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

async function readConfig(cwd: string, file: string, depth: number): Promise<Aliases | undefined> {
  let parsed: z.infer<typeof ConfigSchema>;
  try {
    parsed = ConfigSchema.parse(parseJsonc(await readFile(join(cwd, file), 'utf-8')));
  } catch {
    return undefined;
  }
  const dir = dirname(file);
  const inherited =
    parsed.extends?.startsWith('.') && depth < 5
      ? await readConfig(
          cwd,
          join(dir, parsed.extends.endsWith('.json') ? parsed.extends : `${parsed.extends}.json`),
          depth + 1,
        )
      : undefined;
  const own = parsed.compilerOptions;
  const baseUrl = own?.baseUrl === undefined ? inherited?.baseUrl : join(dir, own.baseUrl);
  const paths = own?.paths ?? inherited?.paths ?? {};
  const base = baseUrl ?? (own?.paths ? dir : (inherited?.base ?? dir));
  return { base, baseUrl, paths };
}

/** The project paths an import specifier can name through the project's aliases. */
export async function importAliases(cwd: string): Promise<(specifier: string) => string[]> {
  const aliases =
    (await readConfig(cwd, 'tsconfig.json', 0)) ?? (await readConfig(cwd, 'jsconfig.json', 0));
  if (!aliases) return () => [];
  return (specifier) => {
    const targets: string[] = [];
    for (const [pattern, replacements] of Object.entries(aliases.paths)) {
      const star = pattern.indexOf('*');
      if (star === -1 ? specifier !== pattern : !matches(specifier, pattern, star)) continue;
      const rest =
        star === -1 ? '' : specifier.slice(star, specifier.length - (pattern.length - star - 1));
      for (const replacement of replacements) {
        targets.push(join(aliases.base, replacement.replace('*', rest)));
      }
    }
    if (aliases.baseUrl !== undefined) targets.push(join(aliases.baseUrl, specifier));
    return targets;
  };
}

function matches(specifier: string, pattern: string, star: number): boolean {
  return (
    specifier.length >= pattern.length - 1 &&
    specifier.startsWith(pattern.slice(0, star)) &&
    specifier.endsWith(pattern.slice(star + 1))
  );
}
