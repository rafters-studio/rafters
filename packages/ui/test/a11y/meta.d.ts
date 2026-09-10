import type { AxeResults } from 'axe-core';

/**
 * The one key every `.a11y` file writes and veneer reads back from the JSON
 * report: axe's result object, verbatim, on the test's task meta.
 */
declare module 'vitest' {
  interface TaskMeta {
    axe?: AxeResults;
  }
}
