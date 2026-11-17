import { useState } from 'react';
import { Wind } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-200 text-slate-600 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Wind className="w-8 h-8 text-teal-700 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-700 text-center max-w-xs">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
