import type { ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
}

const replaceExtension = (src: string, extension: 'avif' | 'webp') =>
  src.replace(/\.jpe?g$/i, `.${extension}`);

export const OptimizedImage = ({ src, alt, decoding = 'async', ...imageProps }: OptimizedImageProps) => {
  const hasOptimizedVariants = /\.jpe?g$/i.test(src);

  return (
    <picture className="optimized-picture">
      {hasOptimizedVariants ? <source srcSet={replaceExtension(src, 'avif')} type="image/avif" /> : null}
      {hasOptimizedVariants ? <source srcSet={replaceExtension(src, 'webp')} type="image/webp" /> : null}
      <img src={src} alt={alt} decoding={decoding} {...imageProps} />
    </picture>
  );
};
