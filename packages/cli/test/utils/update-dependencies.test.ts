import { beforeEach, describe, expect, it, vi } from 'vitest';

const execaMock = vi.fn();
const getPackageManagerMock = vi.fn();
const logMock = vi.fn();

vi.mock('execa', () => ({ execa: execaMock }));
vi.mock('../../src/utils/get-package-manager.js', () => ({
  getPackageManager: getPackageManagerMock,
}));
vi.mock('../../src/utils/ui.js', () => ({ log: logMock }));

const { updateDependencies } = await import('../../src/utils/update-dependencies.js');

class ExecaFailure extends Error {
  constructor(readonly stderr: string) {
    super('Command failed');
  }
}

const ERESOLVE = [
  'npm error code ERESOLVE',
  'npm error ERESOLVE unable to resolve dependency tree',
  'npm error While resolving: app@0.0.0',
  'npm error Found: typescript@7.0.2',
  'npm error Could not resolve dependency:',
  'npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.72.1',
].join('\n');

describe('updateDependencies peer conflict on npm (#2937)', () => {
  beforeEach(() => {
    execaMock.mockReset();
    getPackageManagerMock.mockReset();
    logMock.mockReset();
  });

  it('retries once with --legacy-peer-deps after ERESOLVE and names the conflict', async () => {
    getPackageManagerMock.mockResolvedValue('npm');
    execaMock.mockRejectedValueOnce(new ExecaFailure(ERESOLVE)).mockResolvedValueOnce({});

    await updateDependencies(['zod'], [], { cwd: '/p', silent: true });

    expect(execaMock.mock.calls).toEqual([
      ['npm', ['install', 'zod'], { cwd: '/p' }],
      ['npm', ['install', 'zod', '--legacy-peer-deps'], { cwd: '/p' }],
    ]);
    expect(logMock).toHaveBeenCalledTimes(1);
    const message = String(logMock.mock.calls[0]?.[0]?.message);
    expect(message).toContain('--legacy-peer-deps');
    expect(message).toContain('Found: typescript@7.0.2');
    expect(message).toContain('peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.72.1');
  });

  it('does not pass --legacy-peer-deps when the install succeeds', async () => {
    getPackageManagerMock.mockResolvedValue('npm');
    execaMock.mockResolvedValue({});

    await updateDependencies(['zod'], [], { cwd: '/p', silent: true });

    expect(execaMock.mock.calls).toEqual([['npm', ['install', 'zod'], { cwd: '/p' }]]);
    expect(logMock).not.toHaveBeenCalled();
  });

  it('does not retry a failure that is not ERESOLVE', async () => {
    getPackageManagerMock.mockResolvedValue('npm');
    execaMock.mockRejectedValue(new ExecaFailure('npm error code E404'));

    await expect(updateDependencies(['zod'], [], { cwd: '/p', silent: true })).rejects.toThrow();
    expect(execaMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry under another package manager', async () => {
    getPackageManagerMock.mockResolvedValue('pnpm');
    execaMock.mockRejectedValue(new ExecaFailure(ERESOLVE));

    await expect(updateDependencies(['zod'], [], { cwd: '/p', silent: true })).rejects.toThrow();
    expect(execaMock).toHaveBeenCalledTimes(1);
  });
});
