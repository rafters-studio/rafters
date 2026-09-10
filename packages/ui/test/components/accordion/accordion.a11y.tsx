import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../src/components/accordion/accordion';

interface SceneProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  collapsible?: boolean;
  disabled?: boolean;
  headingLevel?: number;
  disabledItem?: string;
}

function Scene({ disabledItem, ...props }: SceneProps) {
  return (
    <Accordion {...props}>
      {['a', 'b', 'c'].map((value) => (
        <AccordionItem key={value} value={value} disabled={disabledItem === value}>
          <AccordionTrigger>Section {value}</AccordionTrigger>
          <AccordionContent>Body {value}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['collapsed', {}],
  ['one section open', { defaultValue: 'a' }],
  ['collapsible single', { defaultValue: 'a', collapsible: true }],
  ['multiple with two open', { type: 'multiple', defaultValue: ['a', 'c'] }],
  ['heading level 2', { headingLevel: 2, defaultValue: 'b' }],
  ['one section disabled', { disabledItem: 'b' }],
  ['whole accordion disabled', { disabled: true }],
];

for (const [name, props] of scenes) {
  test(`accordion ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
