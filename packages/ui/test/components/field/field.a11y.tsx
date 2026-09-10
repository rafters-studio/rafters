import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Field } from '../../../src/components/field/field';

interface SceneProps {
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** An author-supplied control id the label must track. */
  controlId?: string;
}

function Scene({ controlId, ...props }: SceneProps) {
  return (
    <Field label="Email" {...props}>
      <input id={controlId} type="email" />
    </Field>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['basic', {}],
  ['with description', { description: 'We never share your email' }],
  [
    'error with description hidden',
    { description: 'We never share your email', error: 'Email is required' },
  ],
  ['required', { required: true }],
  ['disabled', { disabled: true }],
  ['author-supplied control id', { controlId: 'signup-email' }],
];

for (const [name, props] of scenes) {
  test(`field ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
