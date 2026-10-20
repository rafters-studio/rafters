/**
 * `react` for the `preact` vitest project: preact/compat plus `act`.
 *
 * vitest-browser-react renders through `React.act` and, when React has none,
 * only awaits the callback, so pending effects have not run by the time a
 * test asserts. preact/compat ships no `act`; preact/test-utils does.
 */
import React from 'preact/compat';
import { act } from 'preact/test-utils';

export * from 'preact/compat';
export { act };
export default Object.assign(React, { act });
