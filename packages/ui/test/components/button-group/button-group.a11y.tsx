import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Button } from '../../../src/components/button/button';
import {
  ButtonGroup,
  type ButtonGroupProps,
} from '../../../src/components/button-group/button-group';

interface Scene {
  props: ButtonGroupProps;
  children: 'plain' | 'buttons' | 'toggles';
}

function children(kind: Scene['children']) {
  switch (kind) {
    case 'plain':
      return (
        <>
          <button type="button">Bold</button>
          <button type="button">Italic</button>
        </>
      );
    case 'buttons':
      return (
        <>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </>
      );
    case 'toggles':
      return (
        <>
          <Button variant="ghost" toggle defaultPressed>
            Grid
          </Button>
          <Button variant="ghost" toggle>
            List
          </Button>
          <Button variant="ghost" toggle>
            Table
          </Button>
        </>
      );
  }
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['horizontal with plain buttons', { props: { 'aria-label': 'Text style' }, children: 'plain' }],
  [
    'vertical with plain buttons',
    { props: { orientation: 'vertical', 'aria-label': 'View' }, children: 'plain' },
  ],
  [
    'horizontal with Button children',
    { props: { 'aria-label': 'Document actions' }, children: 'buttons' },
  ],
  [
    'size sm with Button children',
    { props: { size: 'sm', 'aria-label': 'Document actions' }, children: 'buttons' },
  ],
  [
    'vertical toggle set',
    { props: { orientation: 'vertical', 'aria-label': 'View options' }, children: 'toggles' },
  ],
];

for (const [name, { props, children: kind }] of scenes) {
  test(`button-group ${name}`, async ({ task }) => {
    const { container } = await render(<ButtonGroup {...props}>{children(kind)}</ButtonGroup>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
