import type { HTMLAttributes, ImgHTMLAttributes } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { textStyles, blockStyles, imageStyles } from './styles';

type ElementProps = HTMLAttributes<HTMLElement> & { node?: unknown };

type LinkProps = HTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  node?: unknown;
};

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

// Horizontal rule
export const HorizontalRule = ({ node: _node, ...props }: ElementProps) => (
  <hr className={blockStyles.hr} {...props} />
);

// Strong/bold text
export const Strong = ({ children, node: _node, ...props }: ElementProps) => (
  <strong className={textStyles.strong} {...props}>
    {children}
  </strong>
);

// Emphasized/italic text
export const Emphasis = ({ children, node: _node, ...props }: ElementProps) => (
  <em className={textStyles.em} {...props}>
    {children}
  </em>
);

// Link component
export const Anchor = ({
  children,
  href,
  node: _node,
  ...props
}: LinkProps) => (
  <Link
    className={textStyles.link}
    target="_blank"
    rel="noreferrer"
    href={href as string}
    {...props}
  >
    {children || href}
  </Link>
);

// Blockquote component
export const Blockquote = ({
  children,
  node: _node,
  ...props
}: ElementProps) => (
  <div className={blockStyles.blockquoteWrapper}>
    <blockquote className={blockStyles.blockquote} {...props}>
      {children}
    </blockquote>
  </div>
);

// Paragraph component - using div to avoid hydration mismatches with nested elements
export const Paragraph = ({
  children,
  node: _node,
  ...props
}: ElementProps) => {
  // Always use div to prevent hydration errors from server/client mismatch
  // when detecting block elements (component names differ between SSR and client)
  return (
    <div className={textStyles.paragraph} {...props}>
      {children}
    </div>
  );
};

// Image component with lazy loading
export const MarkdownImage = ({ src, alt, node: _node }: ImageProps) => {
  // Handle case where src is undefined or a Blob (React 19 types)
  if (!src || typeof src !== 'string') return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
    }
  };

  return (
    <div className={imageStyles.wrapper}>
      <div className={imageStyles.container}>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={imageStyles.button}
          aria-label={`View ${alt || 'image'} in full screen`}
        >
          <Image
            src={src}
            alt={alt || 'Image'}
            width={500}
            height={300}
            className={imageStyles.image}
            style={{ maxWidth: '100%', height: 'auto' }}
            unoptimized={true}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Creates basic element components for react-markdown
 */
export const createElementComponents = () => ({
  hr: HorizontalRule,
  strong: Strong,
  em: Emphasis,
  a: Anchor,
  blockquote: Blockquote,
  p: Paragraph,
  img: MarkdownImage,
});
