import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../../../src/components/alert/alert';
import type { AlertVariant } from '../../../src/components/alert/alert.behavior';

const VARIANTS: ReadonlyArray<AlertVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
];

for (const variant of VARIANTS) {
  test(`alert variant=${variant}`, async ({ task }) => {
    const { container } = await render(
      <Alert variant={variant}>
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes were saved.</AlertDescription>
      </Alert>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('alert text only', async ({ task }) => {
  const { container } = await render(<Alert>Saved.</Alert>);
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('alert with title, description, and an action control', async ({ task }) => {
  const { container } = await render(
    <Alert variant="success">
      <AlertTitle>Saved</AlertTitle>
      <AlertDescription>Your changes were saved.</AlertDescription>
      <AlertAction>
        <button type="button">Undo</button>
      </AlertAction>
    </Alert>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('alert with a decorative icon', async ({ task }) => {
  const { container } = await render(
    <Alert variant="destructive">
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" />
      </svg>
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
    </Alert>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
