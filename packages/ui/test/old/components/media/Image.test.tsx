/**
 * Tests for Image component
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Image } from '../../../../src/old/ui/image';

describe('Image', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render image with src and alt', () => {
      render(<Image src="/test.jpg" alt="Test image" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/test.jpg');
      expect(img).toHaveAttribute('alt', 'Test image');
    });

    it('should render within a figure element', () => {
      render(<Image src="/test.jpg" alt="Test image" />);

      const figure = screen.getByRole('figure');
      expect(figure).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Image src="/test.jpg" alt="Test image" className="custom-class" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('custom-class');
    });
  });

  describe('alignment', () => {
    it('should apply left alignment', () => {
      render(<Image src="/test.jpg" alt="Test image" alignment="left" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('mr-auto');
    });

    it('should apply center alignment by default', () => {
      render(<Image src="/test.jpg" alt="Test image" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('mx-auto');
    });

    it('should apply right alignment', () => {
      render(<Image src="/test.jpg" alt="Test image" alignment="right" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('ml-auto');
    });
  });

  describe('size presets', () => {
    it('should apply size preset classes', () => {
      render(<Image src="/test.jpg" alt="Test image" size="md" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('max-w-md');
    });

    it('should apply full width', () => {
      render(<Image src="/test.jpg" alt="Test image" size="full" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('w-full');
    });

    it('should apply small size', () => {
      render(<Image src="/test.jpg" alt="Test image" size="sm" />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('max-w-sm');
    });
  });

  describe('caption', () => {
    it('should render caption when provided', () => {
      render(<Image src="/test.jpg" alt="Test image" caption="Photo caption" />);

      expect(screen.getByText('Photo caption')).toBeInTheDocument();
    });

    it('should render figcaption element', () => {
      render(<Image src="/test.jpg" alt="Test image" caption="Photo caption" />);

      const figcaption = screen.getByText('Photo caption');
      expect(figcaption.tagName).toBe('FIGCAPTION');
    });

    it('should not render caption when not provided', () => {
      render(<Image src="/test.jpg" alt="Test image" />);

      expect(screen.queryByRole('figure')?.querySelector('figcaption')).toBeNull();
    });
  });

  describe('editable mode', () => {
    it('should add group class when editable', () => {
      render(<Image src="/test.jpg" alt="Test image" editable />);

      const figure = screen.getByRole('figure');
      expect(figure).toHaveClass('group');
    });

    it('should show alignment toolbar on hover in editable mode', () => {
      render(<Image src="/test.jpg" alt="Test image" editable />);

      const toolbar = screen.getByRole('toolbar', { name: 'Image alignment' });
      expect(toolbar).toBeInTheDocument();
    });

    it('should call onChange with new alignment when alignment button clicked', () => {
      const onChange = vi.fn();
      render(<Image src="/test.jpg" alt="Test image" editable onChange={onChange} />);

      const leftButton = screen.getByRole('button', { name: 'Align left' });
      fireEvent.click(leftButton);

      expect(onChange).toHaveBeenCalledWith({ alignment: 'left' });
    });

    it('should highlight current alignment', () => {
      render(<Image src="/test.jpg" alt="Test image" editable alignment="right" />);

      const rightButton = screen.getByRole('button', { name: 'Align right' });
      expect(rightButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show upload button when onUpload provided', () => {
      render(<Image src="/test.jpg" alt="Test image" editable onUpload={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Upload new image' })).toBeInTheDocument();
    });

    it('should make caption editable', () => {
      render(
        <Image
          src="/test.jpg"
          alt="Test image"
          editable
          caption="Test caption"
          onCaptionChange={vi.fn()}
        />,
      );

      const figcaption = screen.getByText('Test caption');
      expect(figcaption).toHaveAttribute('contenteditable', 'true');
    });

    it('should call onCaptionChange when caption edited', () => {
      const onCaptionChange = vi.fn();
      render(
        <Image
          src="/test.jpg"
          alt="Test image"
          editable
          caption="Test caption"
          onCaptionChange={onCaptionChange}
        />,
      );

      const figcaption = screen.getByText('Test caption');
      figcaption.textContent = 'New caption';
      fireEvent.input(figcaption);

      expect(onCaptionChange).toHaveBeenCalledWith('New caption');
    });

    it('should show placeholder for caption when editable and no caption', () => {
      render(
        <Image src="/test.jpg" alt="Test image" editable caption="" onCaptionChange={vi.fn()} />,
      );

      const figcaption = document.querySelector('figcaption');
      expect(figcaption).toHaveAttribute('data-placeholder', 'Add a caption...');
    });
  });

  describe('loading and error states', () => {
    it('should show error state on image load failure', () => {
      render(<Image src="/invalid.jpg" alt="Test image" />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('should show drag over state when file dragged over', () => {
      render(<Image src="/test.jpg" alt="Test image" editable onUpload={vi.fn()} />);

      const figure = screen.getByRole('figure');
      fireEvent.dragOver(figure);

      expect(figure).toHaveClass('ring-2');
    });

    it('should remove drag over state on drag leave', () => {
      render(<Image src="/test.jpg" alt="Test image" editable onUpload={vi.fn()} />);

      const figure = screen.getByRole('figure');
      fireEvent.dragOver(figure);
      fireEvent.dragLeave(figure);

      expect(figure).not.toHaveClass('ring-2');
    });
  });

  describe('file upload', () => {
    it('should call onUpload when file selected', async () => {
      const onUpload = vi.fn().mockResolvedValue('/uploaded.jpg');
      const onChange = vi.fn();

      render(
        <Image src="/test.jpg" alt="Test image" editable onUpload={onUpload} onChange={onChange} />,
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([''], 'test.png', { type: 'image/png' });

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      expect(onUpload).toHaveBeenCalledWith(file);
    });

    it('should reject non-image files', async () => {
      const onUpload = vi.fn();

      render(<Image src="/test.jpg" alt="Test image" editable onUpload={onUpload} />);

      const figure = screen.getByRole('figure');
      const file = new File([''], 'test.txt', { type: 'text/plain' });

      fireEvent.drop(figure, {
        dataTransfer: { files: [file] },
      });

      expect(onUpload).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have accessible alignment toolbar', () => {
      render(<Image src="/test.jpg" alt="Test image" editable />);

      const toolbar = screen.getByRole('toolbar', { name: 'Image alignment' });
      expect(toolbar).toBeInTheDocument();
    });

    it('should have aria-pressed on alignment buttons', () => {
      render(<Image src="/test.jpg" alt="Test image" editable alignment="center" />);

      const centerButton = screen.getByRole('button', { name: 'Align center' });
      expect(centerButton).toHaveAttribute('aria-pressed', 'true');

      const leftButton = screen.getByRole('button', { name: 'Align left' });
      expect(leftButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-label on upload input', () => {
      render(<Image src="/test.jpg" alt="Test image" editable onUpload={vi.fn()} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('aria-label', 'Upload image file');
    });
  });
});
