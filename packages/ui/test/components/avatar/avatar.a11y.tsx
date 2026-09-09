import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Avatar, AvatarFallback, AvatarImage } from '../../../src/components/avatar/avatar';
import { AVATAR_SIZES } from '../../../src/components/avatar/avatar.behavior';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

for (const size of AVATAR_SIZES) {
  test(`avatar size=${size}`, async ({ task }) => {
    const { container } = await render(
      <Avatar size={size}>
        <AvatarImage src={PIXEL} alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('avatar image that fails to load falls back to initials', async ({ task }) => {
  const { container } = await render(
    <Avatar>
      <AvatarImage src="/missing.jpg" alt="Jane Doe" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('avatar fallback only', async ({ task }) => {
  const { container } = await render(
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('avatar decorative, hidden from assistive tech', async ({ task }) => {
  const { container } = await render(
    <Avatar aria-hidden="true">
      <AvatarImage src={PIXEL} alt="" />
      <AvatarFallback>AI</AvatarFallback>
    </Avatar>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
