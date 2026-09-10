import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../../../src/components/alert/alert';
import { ALERT_VARIANTS } from '../../../src/components/alert/alert.behavior';

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ...ALERT_VARIANTS.map((variant): [string, () => ReactElement] => [
    `variant=${variant}`,
    () => (
      <Alert variant={variant}>
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes were saved.</AlertDescription>
      </Alert>
    ),
  ]),
  ['text only', () => <Alert>Saved.</Alert>],
  [
    'with title, description, and an action control',
    () => (
      <Alert variant="success">
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes were saved.</AlertDescription>
        <AlertAction>
          <button type="button">Undo</button>
        </AlertAction>
      </Alert>
    ),
  ],
  [
    'with a decorative icon',
    () => (
      <Alert variant="destructive">
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" />
        </svg>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
      </Alert>
    ),
  ],
];

for (const [name, element] of scenes) {
  test(`alert ${name}`, async ({ task }) => {
    const { container } = await render(element());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
