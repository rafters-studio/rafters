import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Textarea, type TextareaProps } from '../../../src/components/textarea/textarea';

// A textarea has no intrinsic name, so every scene carries an accessible name
// the way the conformance test gives it: aria-label on the control (or a
// paired <label> in the last scene).
const scenes: ReadonlyArray<[string, TextareaProps]> = [
  ['valid empty', {}],
  ['seeded value', { defaultValue: 'seeded body' }],
  ['required', { required: true }],
  ['disabled', { disabled: true }],
  ['read-only', { readOnly: true, defaultValue: 'seed' }],
  ['placeholder and rows', { placeholder: 'Type here...', rows: 5, name: 'message' }],
];

for (const [name, props] of scenes) {
  test(`textarea ${name}`, async ({ task }) => {
    const { container } = await render(<Textarea aria-label="Message" {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('textarea invalid with error message', async ({ task }) => {
  const { container } = await render(
    <div>
      <Textarea aria-label="Message" invalid errorId="err" />
      <div data-part="error" id="err">
        Required
      </div>
    </div>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('textarea named by a paired label', async ({ task }) => {
  const { container } = await render(
    <div>
      <label htmlFor="message">Message</label>
      <Textarea id="message" />
    </div>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
