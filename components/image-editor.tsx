import { LoaderIcon } from './icons';
import cn from 'classnames';
import { useState } from 'react';

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
          src={content.startsWith('http') ? content : `data:image/png;base64,${content}`}
          alt={title}
          onLoad={() => setImgLoading(false)}
          onError={() => setImgLoading(false)}
        />
      </picture>
    </div>
  );
}
