import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../src/components/tabs/tabs';

interface SceneProps {
  value?: string;
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  disabledTabs?: string[];
}

const TABS: ReadonlyArray<[string, string]> = [
  ['overview', 'Overview'],
  ['details', 'Details'],
  ['history', 'History'],
];

/** A tablist is not a landmark; the page around it supplies the region. */
function Scene({ disabledTabs = [], ...props }: SceneProps) {
  return (
    <main>
      <Tabs {...props}>
        <TabsList aria-label="Account views">
          {TABS.map(([value, label]) => (
            <TabsTrigger key={value} value={value} disabled={disabledTabs.includes(value)}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(([value, label]) => (
          <TabsContent key={value} value={value}>
            {label} panel
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['first tab selected', { defaultValue: 'overview' }],
  ['middle tab selected', { defaultValue: 'details' }],
  ['last tab selected', { defaultValue: 'history' }],
  ['controlled selection', { value: 'details' }],
  ['vertical orientation', { defaultValue: 'overview', orientation: 'vertical' }],
  ['one tab disabled', { defaultValue: 'overview', disabledTabs: ['details'] }],
];

for (const [name, props] of scenes) {
  test(`tabs ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
