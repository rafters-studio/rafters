import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../src/components/collapsible/collapsible';

interface SceneProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  forceMount?: boolean;
}

function Scene({ forceMount, ...props }: SceneProps) {
  return (
    <Collapsible {...props}>
      <CollapsibleTrigger>Toggle section</CollapsibleTrigger>
      <CollapsibleContent {...(forceMount ? { forceMount } : {})}>
        <p>Revealed content</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['default open', { defaultOpen: true }],
  ['controlled open', { open: true }],
  ['disabled closed', { disabled: true }],
  ['disabled open', { disabled: true, defaultOpen: true }],
  ['force-mounted while closed', { forceMount: true }],
];

for (const [name, props] of scenes) {
  test(`collapsible ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Scene {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
