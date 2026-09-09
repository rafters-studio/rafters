/**
 * Browser-project smoke for the React target: the component renders in real
 * chromium through @vitest/browser-playwright and is reachable by role. The
 * behavior itself is covered by the unit project; this proves the tier runs.
 */
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../../src/components/button/button';

test('renders in a real browser', async () => {
  render(<Button id="b1">Go</Button>);
  await expect.element(page.getByRole('button', { name: 'Go' })).toBeVisible();
});
