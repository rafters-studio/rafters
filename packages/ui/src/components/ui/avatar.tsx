/**
 * User representation component with image and fallback support
 *
 * @cognitive-load 2/10 - Simple display element with predictable behavior
 * @attention-economics Peripheral element: Supports content identification without demanding focus
 * @trust-building Consistent representation builds user recognition; fallbacks prevent broken states
 * @accessibility Alt text required for images; decorative avatars use aria-hidden
 * @semantic-meaning Size hierarchy: xs/sm=inline mentions, md=lists, lg/xl=profiles
 *
 * @usage-patterns
 * DO: Always provide alt text for meaningful avatars
 * DO: Use AvatarFallback for graceful degradation
 * DO: Match size to context (small in lists, large in profiles)
 * DO: Use delayMs on fallback to prevent loading flash
 * NEVER: Use without fallback - images fail
 * NEVER: Rely solely on avatar for identification - pair with name
 * NEVER: Use inconsistent sizes within the same context
 *
 * @example
 * ```tsx
 * // Basic avatar with fallback
 * <Avatar>
 *   <AvatarImage src="/user.jpg" alt="Jane Doe" />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 *
 * // Large profile avatar
 * <Avatar size="xl">
 *   <AvatarImage src="/profile.jpg" alt="User profile" />
 *   <AvatarFallback delayMs={600}>
 *     <UserIcon className="h-8 w-8" />
 *   </AvatarFallback>
 * </Avatar>
 *
 * // Decorative avatar (aria-hidden)
 * <Avatar aria-hidden="true">
 *   <AvatarImage src="/bot.png" alt="" />
 *   <AvatarFallback>AI</AvatarFallback>
 * </Avatar>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  delayMs?: number;
}

type ImageLoadingStatus = 'loading' | 'loaded' | 'error';

interface AvatarContextValue {
  imageLoadingStatus: ImageLoadingStatus;
  onImageLoadingStatusChange: (status: ImageLoadingStatus) => void;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext(): AvatarContextValue {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error('Avatar components must be used within an Avatar');
  }
  return context;
}

import {
  avatarBaseClasses,
  avatarFallbackClasses,
  avatarImageClasses,
  avatarSizeClasses,
} from './avatar.classes';

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size = 'md', children, ...props }, ref) => {
    const [imageLoadingStatus, setImageLoadingStatus] =
      React.useState<ImageLoadingStatus>('loading');

    const contextValue = React.useMemo<AvatarContextValue>(
      () => ({
        imageLoadingStatus,
        onImageLoadingStatusChange: setImageLoadingStatus,
      }),
      [imageLoadingStatus],
    );

    return (
      <AvatarContext.Provider value={contextValue}>
        <span
          ref={ref}
          className={classy(avatarBaseClasses, avatarSizeClasses[size], className)}
          {...props}
        >
          {children}
        </span>
      </AvatarContext.Provider>
    );
  },
);

Avatar.displayName = 'Avatar';

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onLoadingStatusChange, onLoad, onError, ...props }, ref) => {
    const { imageLoadingStatus, onImageLoadingStatusChange } = useAvatarContext();

    const handleStatusChange = React.useCallback(
      (status: ImageLoadingStatus): void => {
        onImageLoadingStatusChange(status);
        onLoadingStatusChange?.(status);
      },
      [onImageLoadingStatusChange, onLoadingStatusChange],
    );

    React.useEffect(() => {
      if (src) {
        handleStatusChange('loading');
      } else {
        handleStatusChange('error');
      }
    }, [src, handleStatusChange]);

    const handleLoad = React.useCallback(
      (event: React.SyntheticEvent<HTMLImageElement>): void => {
        handleStatusChange('loaded');
        onLoad?.(event);
      },
      [handleStatusChange, onLoad],
    );

    const handleError = React.useCallback(
      (event: React.SyntheticEvent<HTMLImageElement>): void => {
        handleStatusChange('error');
        onError?.(event);
      },
      [handleStatusChange, onError],
    );

    if (imageLoadingStatus === 'error') {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={classy(avatarImageClasses, className)}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    );
  },
);

AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, delayMs, children, ...props }, ref) => {
    const { imageLoadingStatus } = useAvatarContext();
    const [canRender, setCanRender] = React.useState(delayMs === undefined);

    React.useEffect(() => {
      if (delayMs !== undefined) {
        const timer = setTimeout(() => {
          setCanRender(true);
        }, delayMs);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [delayMs]);

    if (imageLoadingStatus === 'loaded' || !canRender) {
      return null;
    }

    return (
      <span ref={ref} className={classy(avatarFallbackClasses, className)} {...props}>
        {children}
      </span>
    );
  },
);

AvatarFallback.displayName = 'AvatarFallback';

export default Avatar;
