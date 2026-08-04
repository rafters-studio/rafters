import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, log, setAgentMode, withErrorHandler } from '../../src/utils/ui.js';

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

/**
 * The headline is rendered by ora, not console.log, and only exists when a
 * spinner is running -- so `add:start` has to be logged first and stderr has to
 * be the captured stream. Without both, the assertion silently tests nothing.
 *
 * What is pinned: a run with failures does not print a success headline. Honest
 * per-outcome lines under a green tick is the same lie as a blanket
 * "Added N components", one level up.
 */
describe('add:complete headline', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setAgentMode(false);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setAgentMode(false);
  });

  function headline(): string {
    return stderrSpy.mock.calls.map((call) => String(call[0] ?? '')).join('');
  }

  function complete(written: number, failed: number): void {
    log({ event: 'add:start', components: ['button'] });
    log({
      event: 'add:complete',
      written,
      skipped: 0,
      untracked: 0,
      failed,
      components: [],
      skippedComponents: [],
      untrackedComponents: [],
      failedComponents: failed > 0 ? ['dialog'] : [],
    });
  }

  it('does not claim success when items failed', () => {
    complete(0, 3);

    const out = headline();
    expect(out).toContain('Wrote 0 items');
    expect(out).toContain('3 failed');
  });

  it('still succeeds when nothing failed', () => {
    complete(2, 0);

    const out = headline();
    expect(out).toContain('Wrote 2 items');
    expect(out).not.toContain('failed');
  });

  it('renders the two outcomes as different text', () => {
    complete(2, 0);
    const success = headline();
    stderrSpy.mockClear();
    cleanup();

    complete(0, 3);
    const failure = headline();

    // Asserted on the text, not on ora's symbol: under a non-TTY stream ora
    // falls back to the same dash for succeed() and fail(), so a symbol
    // assertion would pass on a stream where the two look identical.
    expect(failure).not.toBe(success);
    expect(failure).toContain('failed');
    expect(success).not.toContain('failed');
  });
});
