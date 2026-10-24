import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';

/**
 * Write `content` to `path` through a temp file and a rename, so a reader
 * (a dev server's watcher, a browser) never sees a half-written file. A file
 * whose content is already `content` is left untouched. Returns whether it wrote.
 */
export function writeFileAtomicSync(path: string, content: string): boolean {
  if (currentContentSync(path) === content) return false;
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
  return true;
}

export async function writeFileAtomic(path: string, content: string): Promise<boolean> {
  if ((await currentContent(path)) === content) return false;
  const tmp = `${path}.tmp`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, path);
  return true;
}

function currentContentSync(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

async function currentContent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}
