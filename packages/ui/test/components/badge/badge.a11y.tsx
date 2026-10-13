import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Badge } from '../../../src/components/badge/badge';
import { BADGE_SIZES, BADGE_VARIANTS } from '../../../src/components/badge/badge.behavior';

for (const variant of BADGE_VARIANTS) {
  test(`badge variant=${variant}`, async ({ task }) => {
    const { container } = await render(<Badge variant={variant}>{variant}</Badge>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BADGE_SIZES) {
  test(`badge size=${size}`, async ({ task }) => {
    const { container } = await render(<Badge size={size}>Label</Badge>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('badge muted text on a muted ground is contrast-checked against real layout', async ({
  task,
}) => {
  const { container } = await render(
    <div className="bg-muted">
      <Badge variant="muted" className="text-muted-foreground">
        Muted
      </Badge>
    </div>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  // The browser lane exists for this: without layout (happy-dom) axe cannot
  // decide color-contrast and files it under `incomplete`. In chromium it runs.
  expect(results.passes.map((rule) => rule.id)).toContain('color-contrast');
});

test('badge with start and end icons, svg title does not leak into the name', async ({ task }) => {
  const icon = (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <title>Mail</title>
      <path d="M2 4h20v16H2z" stroke="currentColor" />
    </svg>
  );
  const { container } = await render(
    <Badge startIcon={icon} endIcon={icon}>
      Sent
    </Badge>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(container.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
  expect(container.querySelector('[data-part="root"]')?.textContent).toBe('MailSent');
});
