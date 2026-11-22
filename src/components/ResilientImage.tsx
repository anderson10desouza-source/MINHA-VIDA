import React, { useEffect, useState } from 'react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackType: 'avatar' | 'album';
  initials?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackType,
  initials = 'AO',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    if (fallbackType === 'avatar') {
      return (
        <div
          role="img"
          aria-label={alt}
          className={`flex items-center justify-center bg-gradient-to-br from-dark-surface-container-high via-dark-surface-container to-accent-gold/30 text-dark-primary font-headline font-bold select-none ${className}`}
        >
          <span className="text-lg tracking-tight">{initials}</span>
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-dark-surface-container-high via-dark-surface-container-low to-accent-gold/40 text-dark-primary select-none ${className}`}
      >
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">
          music_note
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
