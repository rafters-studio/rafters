/**
 * Tests for Embed component
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Embed } from '../../../../src/old/ui/embed';

describe('Embed', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('YouTube embeds', () => {
    it('should render YouTube iframe', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

      const iframe = screen.getByTitle('youtube embed');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('should render with custom title', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="My Video" />);

      const iframe = screen.getByTitle('My Video');
      expect(iframe).toBeInTheDocument();
    });

    it('should detect YouTube from youtu.be URLs', () => {
      render(<Embed url="https://youtu.be/dQw4w9WgXcQ" />);

      const iframe = screen.getByTitle('youtube embed');
      expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });
  });

  describe('Vimeo embeds', () => {
    it('should render Vimeo iframe', () => {
      render(<Embed url="https://vimeo.com/123456789" />);

      const iframe = screen.getByTitle('vimeo embed');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://player.vimeo.com/video/123456789');
    });
  });

  describe('Twitch embeds', () => {
    it('should render Twitch video iframe', () => {
      render(<Embed url="https://www.twitch.tv/videos/123456789" />);

      const iframe = screen.getByTitle('twitch embed');
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute('src')).toContain('video=123456789');
    });

    it('should render Twitch channel iframe', () => {
      render(<Embed url="https://www.twitch.tv/channelname" />);

      const iframe = screen.getByTitle('twitch embed');
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute('src')).toContain('channel=channelname');
    });

    it('should render Twitch clip iframe', () => {
      render(<Embed url="https://clips.twitch.tv/AwesomeClip" />);

      const iframe = screen.getByTitle('twitch embed');
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute('src')).toContain('clip=AwesomeClip');
    });
  });

  describe('aspect ratio', () => {
    it('should apply default 16:9 aspect ratio', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

      // Find the container div (parent of iframe)
      const iframe = screen.getByTitle('youtube embed');
      const container = iframe.parentElement;
      expect(container).toHaveStyle({ aspectRatio: '16 / 9' });
    });

    it('should apply custom aspect ratio', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" aspectRatio="4:3" />);

      const iframe = screen.getByTitle('youtube embed');
      const container = iframe.parentElement;
      expect(container).toHaveStyle({ aspectRatio: '4 / 3' });
    });

    it('should apply 1:1 aspect ratio', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" aspectRatio="1:1" />);

      const iframe = screen.getByTitle('youtube embed');
      const container = iframe.parentElement;
      expect(container).toHaveStyle({ aspectRatio: '1 / 1' });
    });

    it('should apply 9:16 aspect ratio', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" aspectRatio="9:16" />);

      const iframe = screen.getByTitle('youtube embed');
      const container = iframe.parentElement;
      expect(container).toHaveStyle({ aspectRatio: '9 / 16' });
    });
  });

  describe('security', () => {
    it('should have secure iframe attributes', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

      const iframe = screen.getByTitle('youtube embed');
      expect(iframe).toHaveAttribute('referrerPolicy', 'strict-origin-when-cross-origin');
      expect(iframe).toHaveAttribute('loading', 'lazy');
    });

    it('should validate URL against allowlist', () => {
      render(<Embed url="https://malicious-site.com/video" />);

      // Should show fallback, not iframe
      expect(screen.queryByRole('iframe')).not.toBeInTheDocument();
      expect(
        screen.getByText('This URL is not from a supported embed provider'),
      ).toBeInTheDocument();
    });

    it('should show fallback for unknown providers', () => {
      render(<Embed url="https://example.com/video/123" />);

      expect(screen.queryByRole('iframe')).not.toBeInTheDocument();
      expect(screen.getByText('Open in new tab')).toBeInTheDocument();
    });
  });

  describe('fallback', () => {
    it('should show link to original URL', () => {
      render(<Embed url="https://example.com/video" />);

      const link = screen.getByRole('link', { name: 'Open in new tab' });
      expect(link).toHaveAttribute('href', 'https://example.com/video');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('editable mode', () => {
    it('should show provider badge when editable', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" editable />);

      expect(screen.getByText('YouTube')).toBeInTheDocument();
    });

    it('should show Vimeo badge for Vimeo embeds', () => {
      render(<Embed url="https://vimeo.com/123456789" editable />);

      expect(screen.getByText('Vimeo')).toBeInTheDocument();
    });

    it('should show Twitch badge for Twitch embeds', () => {
      render(<Embed url="https://www.twitch.tv/channelname" editable />);

      expect(screen.getByText('Twitch')).toBeInTheDocument();
    });

    it('should show URL input when editable with invalid URL', () => {
      render(<Embed url="" editable />);

      expect(
        screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'),
      ).toBeInTheDocument();
    });

    it('should call onChange when new URL submitted', () => {
      const onChange = vi.fn();
      render(<Embed url="" editable onChange={onChange} />);

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=test' } });

      const button = screen.getByRole('button', { name: 'Embed' });
      fireEvent.click(button);

      expect(onChange).toHaveBeenCalledWith({ url: 'https://www.youtube.com/watch?v=test' });
    });

    it('should show error message for invalid provider', () => {
      render(<Embed url="https://example.com/video" editable />);

      expect(
        screen.getByText('This URL is not from a supported embed provider'),
      ).toBeInTheDocument();
    });
  });

  describe('iframe attributes', () => {
    it('should have allow attribute for media features', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

      const iframe = screen.getByTitle('youtube embed');
      const allow = iframe.getAttribute('allow');
      expect(allow).toContain('autoplay');
      expect(allow).toContain('picture-in-picture');
    });

    it('should allow fullscreen', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

      const iframe = screen.getByTitle('youtube embed');
      expect(iframe).toHaveAttribute('allowFullScreen');
    });

    it('should have no border', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

      const iframe = screen.getByTitle('youtube embed');
      expect(iframe).toHaveClass('border-0');
    });
  });

  describe('custom className', () => {
    it('should apply custom className to container', () => {
      const { container } = render(
        <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" className="custom-embed" />,
      );

      // The ref is attached to the container div
      const embedContainer = container.firstChild;
      expect(embedContainer).toHaveClass('custom-embed');
    });
  });

  describe('provider override', () => {
    it('should use overridden provider', () => {
      render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" provider="vimeo" editable />);

      // Badge should show overridden provider
      expect(screen.getByText('Vimeo')).toBeInTheDocument();
    });
  });
});
