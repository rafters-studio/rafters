import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClipboard } from '../../src/primitives/clipboard';

// Mock navigator.clipboard
const mockClipboardWrite = vi.fn();
const mockClipboardWriteText = vi.fn();
const mockClipboardRead = vi.fn();
const mockClipboardReadText = vi.fn();

beforeEach(() => {
  // Reset mocks
  mockClipboardWrite.mockReset();
  mockClipboardWriteText.mockReset();
  mockClipboardRead.mockReset();
  mockClipboardReadText.mockReset();

  // Setup navigator.clipboard mock
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      write: mockClipboardWrite,
      writeText: mockClipboardWriteText,
      read: mockClipboardRead,
      readText: mockClipboardReadText,
    },
    writable: true,
    configurable: true,
  });
});

/**
 * Helper to create a ClipboardEvent with mocked clipboardData
 * since test environments don't support the clipboardData constructor option
 */
function createClipboardEvent(
  type: 'paste' | 'copy' | 'cut',
  data: Record<string, string>,
): ClipboardEvent {
  const event = new ClipboardEvent(type, { bubbles: true, cancelable: true });

  // Create a mock DataTransfer-like object
  const mockDataTransfer = {
    getData: (mimeType: string) => data[mimeType] ?? '',
    setData: vi.fn(),
    types: Object.keys(data),
    items: [],
    files: new DataTransfer().files,
    dropEffect: 'none' as const,
    effectAllowed: 'uninitialized' as const,
    clearData: vi.fn(),
    setDragImage: vi.fn(),
  };

  // Override clipboardData on the event
  Object.defineProperty(event, 'clipboardData', {
    value: mockDataTransfer,
    writable: false,
    configurable: true,
  });

  return event;
}

describe('createClipboard', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('writes text to clipboard', async () => {
    mockClipboardWrite.mockResolvedValue(undefined);

    const { write, cleanup } = createClipboard({ container });

    await write({ text: 'Hello, World!' });

    expect(mockClipboardWrite).toHaveBeenCalledTimes(1);
    const clipboardItem = mockClipboardWrite.mock.calls[0][0][0];
    expect(clipboardItem).toBeInstanceOf(ClipboardItem);

    cleanup();
  });

  it('reads text from clipboard', async () => {
    const mockBlob = new Blob(['Test content'], { type: 'text/plain' });
    mockClipboardRead.mockResolvedValue([
      {
        types: ['text/plain'],
        getType: vi.fn().mockResolvedValue(mockBlob),
      },
    ]);

    const { read, cleanup } = createClipboard({ container });

    const data = await read();

    expect(data.text).toBe('Test content');

    cleanup();
  });

  it('writes custom format to clipboard', async () => {
    mockClipboardWrite.mockResolvedValue(undefined);

    const customMimeType = 'application/x-rafters-blocks';
    const { write, cleanup } = createClipboard({
      container,
      customMimeType,
    });

    const customData = { blocks: [{ id: '1', type: 'paragraph' }] };
    await write({ text: 'Plain text', custom: customData });

    expect(mockClipboardWrite).toHaveBeenCalledTimes(1);
    const clipboardItem = mockClipboardWrite.mock.calls[0][0][0];
    expect(clipboardItem).toBeInstanceOf(ClipboardItem);

    cleanup();
  });

  it('fires onPaste callback on paste event', async () => {
    const onPaste = vi.fn();
    const { cleanup } = createClipboard({
      container,
      onPaste,
    });

    const pasteEvent = createClipboardEvent('paste', {
      'text/plain': 'Pasted text',
      'text/html': '<p>Pasted HTML</p>',
    });

    container.dispatchEvent(pasteEvent);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(onPaste).toHaveBeenCalledTimes(1);
    });
    expect(onPaste).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Pasted text',
        html: '<p>Pasted HTML</p>',
      }),
    );

    cleanup();
  });

  it('fires onCopy callback on copy event', async () => {
    const onCopy = vi.fn();
    const { cleanup } = createClipboard({
      container,
      onCopy,
    });

    const copyEvent = createClipboardEvent('copy', {
      'text/plain': 'Copied text',
    });

    container.dispatchEvent(copyEvent);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(onCopy).toHaveBeenCalledTimes(1);
    });
    expect(onCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Copied text',
      }),
    );

    cleanup();
  });

  it('fires onCut callback on cut event', async () => {
    const onCut = vi.fn();
    const { cleanup } = createClipboard({
      container,
      onCut,
    });

    const cutEvent = createClipboardEvent('cut', {
      'text/plain': 'Cut text',
    });

    container.dispatchEvent(cutEvent);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(onCut).toHaveBeenCalledTimes(1);
    });
    expect(onCut).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Cut text',
      }),
    );

    cleanup();
  });

  it('handles permission denied gracefully', async () => {
    mockClipboardWrite.mockRejectedValue(new DOMException('Permission denied'));
    mockClipboardRead.mockRejectedValue(new DOMException('Permission denied'));
    mockClipboardReadText.mockRejectedValue(new DOMException('Permission denied'));

    const { write, read, cleanup } = createClipboard({ container });

    // Should not throw
    await expect(write({ text: 'Test' })).resolves.toBeUndefined();

    // Should return empty data
    const data = await read();
    expect(data).toEqual({});

    cleanup();
  });

  it('cleans up event listeners', async () => {
    const onPaste = vi.fn();
    const onCopy = vi.fn();
    const onCut = vi.fn();

    const { cleanup } = createClipboard({
      container,
      onPaste,
      onCopy,
      onCut,
    });

    // Cleanup removes listeners
    cleanup();

    // Dispatch events after cleanup
    container.dispatchEvent(createClipboardEvent('paste', { 'text/plain': 'test' }));
    container.dispatchEvent(createClipboardEvent('copy', { 'text/plain': 'test' }));
    container.dispatchEvent(createClipboardEvent('cut', { 'text/plain': 'test' }));

    // Give time for any potential async handlers
    await new Promise((resolve) => setTimeout(resolve, 10));

    // None of the callbacks should have been called after cleanup
    expect(onPaste).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(onCut).not.toHaveBeenCalled();
  });

  it('returns no-op in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const result = createClipboard({ container });

    expect(result.cleanup).toBeInstanceOf(Function);
    expect(result.write).toBeInstanceOf(Function);
    expect(result.read).toBeInstanceOf(Function);

    // Should not throw
    result.cleanup();

    globalThis.window = originalWindow;
  });

  it('parses custom MIME type as JSON', async () => {
    const customMimeType = 'application/x-rafters-blocks';
    const onPaste = vi.fn();
    const { cleanup } = createClipboard({
      container,
      customMimeType,
      onPaste,
    });

    const customData = { blocks: [{ id: '1' }] };
    const pasteEvent = createClipboardEvent('paste', {
      'text/plain': 'Plain text',
      [customMimeType]: JSON.stringify(customData),
    });

    container.dispatchEvent(pasteEvent);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(onPaste).toHaveBeenCalledTimes(1);
    });
    expect(onPaste).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Plain text',
        custom: customData,
      }),
    );

    cleanup();
  });

  it('falls back to text-only when custom MIME type write fails', async () => {
    // First call with ClipboardItem fails, second call with writeText succeeds
    mockClipboardWrite.mockRejectedValue(new DOMException('Unsupported MIME type'));
    mockClipboardWriteText.mockResolvedValue(undefined);

    const customMimeType = 'application/x-rafters-blocks';
    const { write, cleanup } = createClipboard({
      container,
      customMimeType,
    });

    await write({ text: 'Fallback text', custom: { blocks: [] } });

    expect(mockClipboardWriteText).toHaveBeenCalledWith('Fallback text');

    cleanup();
  });

  it('handles empty clipboard gracefully', async () => {
    mockClipboardRead.mockResolvedValue([]);

    const { read, cleanup } = createClipboard({ container });

    const data = await read();

    expect(data).toEqual({});

    cleanup();
  });

  it('reads HTML content from clipboard', async () => {
    const textBlob = new Blob(['Plain text'], { type: 'text/plain' });
    const htmlBlob = new Blob(['<p>Rich text</p>'], { type: 'text/html' });

    mockClipboardRead.mockResolvedValue([
      {
        types: ['text/plain', 'text/html'],
        getType: vi.fn((type: string) => {
          if (type === 'text/plain') return Promise.resolve(textBlob);
          if (type === 'text/html') return Promise.resolve(htmlBlob);
          return Promise.reject(new Error('Unknown type'));
        }),
      },
    ]);

    const { read, cleanup } = createClipboard({ container });

    const data = await read();

    expect(data.text).toBe('Plain text');
    expect(data.html).toBe('<p>Rich text</p>');

    cleanup();
  });

  it('reads custom MIME type from clipboard', async () => {
    const customMimeType = 'application/x-rafters-blocks';
    const customData = { blocks: [{ id: '1', type: 'heading' }] };
    const customBlob = new Blob([JSON.stringify(customData)], { type: customMimeType });

    mockClipboardRead.mockResolvedValue([
      {
        types: [customMimeType],
        getType: vi.fn().mockResolvedValue(customBlob),
      },
    ]);

    const { read, cleanup } = createClipboard({
      container,
      customMimeType,
    });

    const data = await read();

    expect(data.custom).toEqual(customData);

    cleanup();
  });

  it('falls back to readText when read() fails', async () => {
    mockClipboardRead.mockRejectedValue(new DOMException('Not supported'));
    mockClipboardReadText.mockResolvedValue('Fallback text content');

    const { read, cleanup } = createClipboard({ container });

    const data = await read();

    expect(data.text).toBe('Fallback text content');

    cleanup();
  });

  it('handles null clipboardData gracefully', async () => {
    const onPaste = vi.fn();
    const { cleanup } = createClipboard({
      container,
      onPaste,
    });

    // Create event without clipboardData (simulates edge case)
    const event = new ClipboardEvent('paste', { bubbles: true });
    container.dispatchEvent(event);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(onPaste).toHaveBeenCalledTimes(1);
    });
    expect(onPaste).toHaveBeenCalledWith({});

    cleanup();
  });

  it('handles non-JSON custom data as string', async () => {
    const customMimeType = 'application/x-rafters-blocks';
    const onPaste = vi.fn();
    const { cleanup } = createClipboard({
      container,
      customMimeType,
      onPaste,
    });

    // Custom data that is not valid JSON
    const pasteEvent = createClipboardEvent('paste', {
      [customMimeType]: 'not valid json',
    });

    container.dispatchEvent(pasteEvent);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(onPaste).toHaveBeenCalledTimes(1);
    });
    expect(onPaste).toHaveBeenCalledWith(
      expect.objectContaining({
        custom: 'not valid json',
      }),
    );

    cleanup();
  });

  it('writes HTML content to clipboard', async () => {
    mockClipboardWrite.mockResolvedValue(undefined);

    const { write, cleanup } = createClipboard({ container });

    await write({ html: '<p>Hello</p>' });

    expect(mockClipboardWrite).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
