import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { log, setAgentMode, withErrorHandler } from '../../src/utils/ui.js';

describe('withErrorHandler', () => {
  let savedExitCode: number | undefined;

  beforeEach(() => {
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
  });

  it('calls the wrapped action with arguments', async () => {
    const action = vi.fn<[string], Promise<void>>().mockResolvedValue(undefined);
    const wrapped = withErrorHandler(action);

    await wrapped('hello');

    expect(action).toHaveBeenCalledWith('hello');
  });

  it('sets process.exitCode to 1 on Error', async () => {
    const action = vi.fn().mockRejectedValue(new Error('boom'));
    const wrapped = withErrorHandler(action);

    await wrapped();

    expect(process.exitCode).toBe(1);
  });

  it('sets process.exitCode to 1 on string throw', async () => {
    const action = vi.fn().mockRejectedValue('string error');
    const wrapped = withErrorHandler(action);

    await wrapped();

    expect(process.exitCode).toBe(1);
  });

  it('does not set exitCode when action succeeds', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const wrapped = withErrorHandler(action);

    await wrapped();

    expect(process.exitCode).toBeUndefined();
  });
});

/**
 * The human report is the surface that cost a consumer hours: a blanket
 * "Added N components" over a tree where nothing was written, files were
 * skipped, and components were found untracked. Agent JSON carries the fields
 * for free; this is the render that has to spend them.
 */
describe('add:complete human output', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setAgentMode(false);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setAgentMode(false);
  });

  function printed(): string {
    return logSpy.mock.calls.map((call) => String(call[0] ?? '')).join('\n');
  }

  it('names every outcome separately over a mixed-state tree', () => {
    log({
      event: 'add:complete',
      written: 0,
      skipped: 2,
      untracked: 1,
      failed: 1,
      components: [],
      skippedComponents: ['button', 'card'],
      untrackedComponents: ['container'],
      failedComponents: ['dialog'],
    });

    const output = printed();
    expect(output).toContain('Skipped: 2');
    expect(output).toContain('button, card');
    expect(output).toContain('Untracked on disk, now tracked: 1 -- container');
    expect(output).toContain('Failed: 1 -- dialog');
    // The old report claimed an install over exactly this state.
    expect(output).not.toContain('Added');
  });

  it('says nothing about outcomes that did not happen', () => {
    log({
      event: 'add:complete',
      written: 2,
      skipped: 0,
      untracked: 0,
      failed: 0,
      components: ['button', 'card'],
      skippedComponents: [],
      untrackedComponents: [],
      failedComponents: [],
    });

    const output = printed();
    expect(output).not.toContain('Skipped');
    expect(output).not.toContain('Untracked');
    expect(output).not.toContain('Failed');
  });
});
