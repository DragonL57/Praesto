import React, { type HTMLAttributes, type ImgHTMLAttributes, Children } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { textStyles, blockStyles, imageStyles } from './styles';
import { TextGenerateEffect } from '../ui/text-generate-effect';

type ElementProps = HTMLAttributes<HTMLElement> & { node?: unknown };

type LinkProps = HTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  node?: unknown;
};

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

/**
 * Higher-order helper to wrap raw text content with the word-by-word blur reveal effect.
 * 
 * Used across markdown components to ensure that whenever text is rendered (even inside 
 * bold, italic, or links), it benefits from the cinematic generation animation.
 * 
 * It iterates through children and specifically targets string nodes, while leaving 
 * other React elements (like nested icons or other components) untouched.
 * 
 * @param children - The children of the component to process
 * @returns The children with string content wrapped in TextGenerateEffect
 */
export const wrapTextWithEffect = (children: React.ReactNode) => {
  return Children.map(children, (child) => {
    // Only wrap direct string children that have significant content (non-empty strings).
    // This check avoids wrapping single characters (like punctuation) in unnecessary containers,
    // keeping the DOM cleaner and the animation focused on words.
    if (typeof child === 'string' && child.trim().length > 1) {
      return <TextGenerateEffect words={child} as="span" />;
    }
    return child;
  });
};

// Horizontal rule
export const HorizontalRule = ({ node: _node, ...props }: ElementProps) => (
  <hr className={blockStyles.hr} {...props} />
);

// Strong/bold text - Applies the word reveal inside bold tags
export const Strong = ({ children, node: _node, ...props }: ElementProps) => (
  <strong className={textStyles.strong} {...props}>
    {wrapTextWithEffect(children)}
  </strong>
);

// Emphasized/italic text - Applies the word reveal inside italic tags
export const Emphasis = ({ children, node: _node, ...props }: ElementProps) => (
  <em className={textStyles.em} {...props}>
    {wrapTextWithEffect(children)}
  </em>
);

// Link component - Applies the word reveal to link text
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
    {wrapTextWithEffect(children) || href}
  </Link>
);

// Blockquote component - Applies the word reveal to quoted text
export const Blockquote = ({
  children,
  node: _node,
  ...props
}: ElementProps) => (
  <div className={blockStyles.blockquoteWrapper}>
    <blockquote className={blockStyles.blockquote} {...props}>
      {wrapTextWithEffect(children)}
    </blockquote>
  </div>
);

// Paragraph component - The primary entry point for text content
// Using div to avoid hydration mismatches with potentially nested block-like components
export const Paragraph = ({
  children,
  node: _node,
  ...props
}: ElementProps) => {
  return (
    <div className={textStyles.paragraph} {...props}>
      {wrapTextWithEffect(children)}
    </div>
  );
};

// Image component with lazy loading and full-screen preview functionality
export const MarkdownImage = ({ src, alt, node: _node }: ImageProps) => {
  // Handle cases where src might be invalid (e.g., undefined or Blob during SSR)
  if (!src || typeof src !== 'string') return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Logic for full screen preview could be triggered here
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
 * Creates basic element components for react-markdown with the integrated generation effect
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
