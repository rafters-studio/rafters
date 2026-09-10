import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../../src/components/hover-card/hover-card';
import type { Align, Side } from '../../../src/primitives/types';

interface SceneProps {
  open?: boolean;
  defaultOpen?: boolean;
  disableHoverableContent?: boolean;
  side?: Side;
  align?: Align;
}

/**
 * The preview is a DOM sibling of its trigger inside the root (#2148): it is
 * never portalled, so `container` holds the whole component in both states.
 * The content is role="dialog" and the consumer names it, as the conformance
 * tests do.
 */
function Scene(props: SceneProps) {
  return (
    <main>
      <HoverCard {...props}>
        <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
        <HoverCardContent aria-label="John Doe">
          <span>Software Engineer</span>
        </HoverCardContent>
      </HoverCard>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['default open', { defaultOpen: true }],
  ['controlled open', { open: true }],
  ['controlled closed', { open: false }],
  ['un-hoverable content closed', { disableHoverableContent: true }],
  ['open on the top start side', { defaultOpen: true, side: 'top', align: 'start' }],
];

for (const [name, props] of scenes) {
  test(`hover-card ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
