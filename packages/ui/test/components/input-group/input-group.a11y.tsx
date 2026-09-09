import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../../../src/components/input-group/input-group';

/** Every scene names the contained control with an aria-label. */
const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  [
    'both affixes',
    () => (
      <InputGroup>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon position="end">USD</InputGroupAddon>
      </InputGroup>
    ),
  ],
  [
    'start affix only',
    () => (
      <InputGroup>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" defaultValue="42" />
      </InputGroup>
    ),
  ],
  [
    'no affixes',
    () => (
      <InputGroup>
        <InputGroupInput aria-label="Bare" />
      </InputGroup>
    ),
  ],
  [
    'invalid',
    () => (
      <InputGroup invalid>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
      </InputGroup>
    ),
  ],
  [
    'disabled group',
    () => (
      <InputGroup disabled>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon position="end">
          <button type="button">Apply</button>
        </InputGroupAddon>
      </InputGroup>
    ),
  ],
  [
    'individually disabled control',
    () => (
      <InputGroup>
        <InputGroupInput aria-label="Amount" disabled />
      </InputGroup>
    ),
  ],
  [
    'size sm',
    () => (
      <InputGroup size="sm">
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
      </InputGroup>
    ),
  ],
  [
    'size lg with an email control',
    () => (
      <InputGroup size="lg">
        <InputGroupInput aria-label="Email" type="email" name="email" placeholder="you@x.com" />
      </InputGroup>
    ),
  ],
  [
    'action button affix',
    () => (
      <InputGroup>
        <InputGroupInput aria-label="Code" />
        <InputGroupAddon position="end">
          <button type="button">Apply</button>
        </InputGroupAddon>
      </InputGroup>
    ),
  ],
];

for (const [name, scene] of scenes) {
  test(`input-group ${name}`, async ({ task }) => {
    const { container } = await render(scene());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
