/**
 * Image component with upload, editing, and responsive display support
 *
 * @cognitive-load 3/10 - Familiar image pattern with clear interaction points
 * @attention-economics Content-driven: Image is primary focus, controls secondary
 * @trust-building Predictable resize handles, clear loading/error states
 * @accessibility Alt text required, focus indicators for editable mode
 * @semantic-meaning figure/figcaption for proper image semantics
 *
 * @usage-patterns
 * DO: Always provide meaningful alt text
 * DO: Use alignment to create visual rhythm with text
 * DO: Size images appropriately for their context
 * NEVER: Use images without alt text
 * NEVER: Use decorative alignment that breaks reading flow
 *
 * @example
 * ```tsx
 * // Static image
 * <Image src="/photo.jpg" alt="A sunset over the ocean" />
 *
 * // Editable image with caption
 * <Image
 *   src={imageUrl}
 *   alt={altText}
 *   caption="Photo by John Doe"
 *   editable
 *   onChange={(props) => updateImage(props)}
 *   onUpload={async (file) => uploadFile(file)}
 * />
 * ```
 */
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import classy from '../../primitives/classy';
import {
  type ImageAlignment,
  type ImageSize,
  imageAlignmentClasses,
  imageBaseClasses,
  imageCaptionClasses,
  imageImgClasses,
  imageSizeClasses,
} from './image.classes';

export type { ImageAlignment, ImageSize };

export interface ImageProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility (required) */
  alt: string;
  /** Image size preset - uses token-based max-width */
  size?: ImageSize | undefined;
  /** Horizontal alignment */
  alignment?: ImageAlignment | undefined;
  /** Caption text below image */
  caption?: string | undefined;
  /** Enable editing mode */
  editable?: boolean | undefined;
  /** Called when image properties change */
  onChange?: ((props: Partial<ImageProps>) => void) | undefined;
  /** Called to upload a new image file, returns the new src URL */
  onUpload?: ((file: File) => Promise<string>) | undefined;
  /** Called when caption changes */
  onCaptionChange?: ((caption: string) => void) | undefined;
}

/**
 * Loading state indicator
 */
function LoadingOverlay() {
  return (
    <output className="absolute inset-0 flex items-center justify-center bg-muted/80">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="sr-only">Loading image...</span>
    </output>
  );
}

/**
 * Error state indicator
 */
function ErrorOverlay({ message }: { message: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive"
      role="alert"
    >
      <svg
        className="mb-2 h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  );
}

/**
 * Alignment control buttons for editable mode
 */
function AlignmentControls({
  alignment,
  onAlignmentChange,
}: {
  alignment: ImageAlignment;
  onAlignmentChange: (alignment: ImageAlignment) => void;
}) {
  const alignments: ImageAlignment[] = ['left', 'center', 'right'];

  return (
    <div
      className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1 rounded-md bg-background/95 p-1 shadow-md backdrop-blur"
      role="toolbar"
      aria-label="Image alignment"
    >
      {alignments.map((align) => (
        <button
          key={align}
          type="button"
          onClick={() => onAlignmentChange(align)}
          className={classy(
            'rounded p-1.5 transition-colors',
            alignment === align
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground',
          )}
          aria-label={`Align ${align}`}
          aria-pressed={alignment === align}
        >
          {align === 'left' && (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 4.5A1.5 1.5 0 013.5 3h13a1.5 1.5 0 010 3h-13A1.5 1.5 0 012 4.5zm0 5A1.5 1.5 0 013.5 8h8a1.5 1.5 0 010 3h-8A1.5 1.5 0 012 9.5zm0 5A1.5 1.5 0 013.5 13h10a1.5 1.5 0 010 3h-10A1.5 1.5 0 012 14.5z" />
            </svg>
          )}
          {align === 'center' && (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 4.5A1.5 1.5 0 013.5 3h13a1.5 1.5 0 010 3h-13A1.5 1.5 0 012 4.5zm3 5A1.5 1.5 0 016.5 8h7a1.5 1.5 0 010 3h-7A1.5 1.5 0 015 9.5zm-1 5A1.5 1.5 0 015.5 13h9a1.5 1.5 0 010 3h-9A1.5 1.5 0 014 14.5z" />
            </svg>
          )}
          {align === 'right' && (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 4.5A1.5 1.5 0 013.5 3h13a1.5 1.5 0 010 3h-13A1.5 1.5 0 012 4.5zm5 5A1.5 1.5 0 018.5 8h8a1.5 1.5 0 010 3h-8A1.5 1.5 0 017 9.5zm2 5A1.5 1.5 0 0110.5 13h6a1.5 1.5 0 010 3h-6A1.5 1.5 0 019 14.5z" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

export const Image = React.forwardRef<HTMLElement, ImageProps>(
  (
    {
      src,
      alt,
      size,
      alignment = 'center',
      caption,
      editable = false,
      onChange,
      onUpload,
      onCaptionChange,
      className,
      ...props
    },
    ref,
  ) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const captionRef = useRef<HTMLElement>(null);

    // Handle image load
    const handleLoad = useCallback(() => {
      setIsLoading(false);
      setError(null);
    }, []);

    // Handle image error
    const handleError = useCallback(() => {
      setIsLoading(false);
      setError('Failed to load image');
    }, []);

    // Handle file upload
    const handleFileUpload = useCallback(
      async (file: File) => {
        if (!onUpload) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select an image file');
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const newSrc = await onUpload(file);
          onChange?.({ src: newSrc });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setIsLoading(false);
        }
      },
      [onUpload, onChange],
    );

    // Handle file input change
    const handleFileInputChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          handleFileUpload(file);
        }
      },
      [handleFileUpload],
    );

    // Handle drag and drop
    const handleDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);

        const file = event.dataTransfer.files[0];
        if (file) {
          handleFileUpload(file);
        }
      },
      [handleFileUpload],
    );

    // Handle paste
    const handlePaste = useCallback(
      (event: React.ClipboardEvent) => {
        const items = event.clipboardData.items;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              handleFileUpload(file);
              break;
            }
          }
        }
      },
      [handleFileUpload],
    );

    // Handle alignment change
    const handleAlignmentChange = useCallback(
      (newAlignment: ImageAlignment) => {
        onChange?.({ alignment: newAlignment });
      },
      [onChange],
    );

    // Handle caption input
    const handleCaptionInput = useCallback(() => {
      if (!captionRef.current || !onCaptionChange) return;
      const text = captionRef.current.textContent ?? '';
      onCaptionChange(text);
    }, [onCaptionChange]);

    return (
      <figure
        ref={ref}
        className={classy(
          imageBaseClasses,
          size && imageSizeClasses[size],
          imageAlignmentClasses[alignment],
          editable && 'group',
          isDragOver && 'ring-2 ring-primary ring-offset-2',
          className,
        )}
        onDragOver={editable ? handleDragOver : undefined}
        onDragLeave={editable ? handleDragLeave : undefined}
        onDrop={editable ? handleDrop : undefined}
        onPaste={editable ? handlePaste : undefined}
        {...props}
      >
        {/* Main image container */}
        <div className="relative overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={imageImgClasses}
          />

          {/* Loading overlay */}
          {isLoading && <LoadingOverlay />}

          {/* Error overlay */}
          {error && <ErrorOverlay message={error} />}

          {/* Editable controls */}
          {editable && !isLoading && !error && (
            <>
              {/* Alignment toolbar */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="pointer-events-auto">
                  <AlignmentControls
                    alignment={alignment}
                    onAlignmentChange={handleAlignmentChange}
                  />
                </div>
              </div>

              {/* Upload click area */}
              {onUpload && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Upload new image"
                  >
                    <span className="rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow">
                      Replace image
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-label="Upload image file"
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Caption */}
        {(caption !== undefined || (editable && onCaptionChange)) && (
          <figcaption
            ref={captionRef}
            className={classy(
              imageCaptionClasses,
              editable &&
                'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1',
            )}
            contentEditable={editable}
            suppressContentEditableWarning={editable}
            onInput={editable ? handleCaptionInput : undefined}
            data-placeholder={editable ? 'Add a caption...' : undefined}
          >
            {caption}
          </figcaption>
        )}
      </figure>
    );
  },
);

Image.displayName = 'Image';

export default Image;
