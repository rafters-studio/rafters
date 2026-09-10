import { afterEach } from 'vitest';

/**
 * A test in an `.a11y` file that runs axe but never assigns the result to
 * `task.meta.axe` is a defect: the JSON report is the only channel veneer
 * reads, and an a11y test that leaves it empty has produced no evidence.
 */
afterEach(({ task }) => {
  if (!task.file.filepath.includes('.a11y.')) return;
  if (task.meta.axe === undefined) {
    throw new Error(`a11y: ${task.name} ran without attaching axe results to task.meta`);
  }
});
