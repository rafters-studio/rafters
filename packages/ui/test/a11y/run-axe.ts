import { run } from 'axe-core';
import type { AxeResults } from 'axe-core';

/** Runs axe against a host element and returns axe's own result object. */
export async function runAxe(host: Element): Promise<AxeResults> {
  return run(host);
}
