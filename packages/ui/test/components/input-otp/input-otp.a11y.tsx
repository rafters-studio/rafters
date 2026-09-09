import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { InputOTP } from '../../../src/components/input-otp/input-otp';

interface SceneProps {
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  'aria-label'?: string;
}

/** The oracle's 3-3 grouping with a separator, over one real named input. */
function Scene(props: SceneProps) {
  return (
    <InputOTP maxLength={6} {...props}>
      <InputOTP.Group>
        <InputOTP.Slot index={0} />
        <InputOTP.Slot index={1} />
        <InputOTP.Slot index={2} />
      </InputOTP.Group>
      <InputOTP.Separator />
      <InputOTP.Group>
        <InputOTP.Slot index={3} />
        <InputOTP.Slot index={4} />
        <InputOTP.Slot index={5} />
      </InputOTP.Group>
    </InputOTP>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['empty', {}],
  ['partially filled', { defaultValue: '123' }],
  ['complete', { defaultValue: '123456' }],
  ['disabled', { disabled: true, defaultValue: '12' }],
  ['required with a form name', { required: true, name: 'code' }],
  ['custom accessible name', { 'aria-label': 'Verification code' }],
];

for (const [name, props] of scenes) {
  test(`input-otp ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
