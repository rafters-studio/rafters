import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Kbd } from '../../../src/components/kbd/kbd';

interface SceneProps {
  keys: string[];
  className?: string;
}

/** A key cap is inline text; a sentence around it is the natural host. */
function Scene({ keys, className }: SceneProps) {
  return (
    <p>
      Press{' '}
      {keys.map((key, index) => (
        <span key={key}>
          {index > 0 ? ' + ' : null}
          <Kbd className={className}>{key}</Kbd>
        </span>
      ))}
    </p>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['single key', { keys: ['Enter'] }],
  ['two-key combination', { keys: ['Cmd', 'S'] }],
  ['three-key combination', { keys: ['Ctrl', 'Shift', 'P'] }],
  ['glyph key', { keys: ['⌘'] }],
  ['consumer className', { keys: ['Esc'], className: 'ml-1' }],
];

for (const [name, props] of scenes) {
  test(`kbd ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
