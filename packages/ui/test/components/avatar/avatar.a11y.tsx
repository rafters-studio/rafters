import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Avatar, AvatarFallback, AvatarImage } from '../../../src/components/avatar/avatar';
import { AVATAR_SIZES } from '../../../src/components/avatar/avatar.behavior';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ...AVATAR_SIZES.map((size): [string, () => ReactElement] => [
    `size=${size}`,
    () => (
      <Avatar size={size}>
        <AvatarImage src={PIXEL} alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    ),
  ]),
  [
    'image that fails to load falls back to initials',
    () => (
      <Avatar>
        <AvatarImage src="/missing.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    ),
  ],
  [
    'fallback only',
    () => (
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    ),
  ],
  [
    'decorative, hidden from assistive tech',
    () => (
      <Avatar aria-hidden="true">
        <AvatarImage src={PIXEL} alt="" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
    ),
  ],
];

for (const [name, element] of scenes) {
  test(`avatar ${name}`, async ({ task }) => {
    const { container } = await render(element());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
