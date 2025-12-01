import { LoaderIcon } from './icons';
import cn from 'classnames';
import { useState, useRef, useEffect } from 'react';

interface ImageEditorProps {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
}

export function ImageEditor({
  title,
  content,
  status,
  isInline,
}: ImageEditorProps) {
  const [imgLoading, setImgLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(content);
  const retryCount = useRef(0);

  // Reset imgSrc and retry state if content changes (e.g., when opening modal)
  useEffect(() => {
    setImgSrc(content);
    setImgLoading(true);
    retryCount.current = 0;
  }, [content]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    // Only retry if the error is likely a 404 (image not found)
    if (
      retryCount.current < 5 &&
      imgSrc.startsWith('http') &&
      target.naturalWidth === 0
    ) {
      retryCount.current += 1;
      setTimeout(() => {
        setImgSrc(`${content + (content.includes('?') ? '&' : '?')}retry=${Date.now()}`);
        setImgLoading(true);
      }, 2000);
    } else {
      setImgLoading(false);
    }
  };

  const showSpinner = status === 'streaming' || imgLoading;

  return (
    <div
      className={cn('flex flex-row items-center justify-center w-full', {
        'h-[calc(100dvh-60px)]': !isInline,
        'h-[200px]': isInline,
      })}
    >
      {showSpinner ? (
        <div className="flex flex-row gap-4 items-center">
          {!isInline && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
          <div>Generating Image...</div>
        </div>
      ) : null}
      <picture style={{ display: showSpinner ? 'none' : undefined }}>
        <img
          className={cn('w-full h-fit max-w-[800px]', {
            'p-0 md:p-20': !isInline,
          })}
          src={imgSrc.startsWith('http') ? imgSrc : `data:image/png;base64,${imgSrc}`}
          alt={title}
          onLoad={() => setImgLoading(false)}
          onError={handleError}
        />
      </picture>
    </div>
  );
}
