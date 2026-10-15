/**
 * Image Optimization Utilities
 * Handles responsive images, lazy loading, and format selection
 */

export interface ImageVariant {
  src: string;
  width: number;
  height?: number;
  quality?: number;
}

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // eager vs lazy
  quality?: 'high' | 'medium' | 'low'; // default: 'medium'
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  aspectRatio?: string; // e.g., '16/9', '4/3', '1/1'
}

/**
 * Generate responsive image srcset
 * Creates multiple resolutions for different devices
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 1024, 1280, 1920]
): string {
  return widths
    .map((width) => `${addImageQuality(baseUrl, 'medium')}&w=${width} ${width}w`)
    .join(', ');
}

/**
 * Add quality parameter to image URL
 * Useful for CDN image optimization
 */
export function addImageQuality(url: string, quality: 'high' | 'medium' | 'low' = 'medium'): string {
  if (!url) return url;

  const qualityMap = {
    high: '90',
    medium: '75',
    low: '60',
  };

  // If it's a CDN URL, add quality param
  if (url.includes('cloudinary') || url.includes('imgix') || url.includes('cdn')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}q=${qualityMap[quality]}`;
  }

  return url;
}

/**
 * Generate WebP format URL
 * Fallback for browsers that don't support WebP
 */
export function toWebP(url: string): string {
  if (!url || url.includes('.webp')) return url;
  return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

/**
 * Generate AVIF format URL
 * Most modern format, best compression
 */
export function toAVIF(url: string): string {
  if (!url || url.includes('.avif')) return url;
  return url.replace(/\.(jpg|jpeg|png)$/i, '.avif');
}

/**
 * Calculate responsive sizes
 * For use in <img sizes> attribute
 */
export function responsiveSizes(
  sizes: Record<string, string> = {
    mobile: '100vw',
    tablet: '100vw',
    desktop: '50vw',
  }
): string {
  return `
    (max-width: 640px) ${sizes.mobile},
    (max-width: 1024px) ${sizes.tablet},
    ${sizes.desktop}
  `.trim();
}

/**
 * Calculate aspect ratio padding-bottom percentage
 */
export function getAspectRatioPadding(aspectRatio: string): number {
  const [width, height] = aspectRatio.split('/').map(Number);
  return (height / width) * 100;
}

/**
 * Estimate reading time from HTML content
 */
export function calculateReadingTime(content: string, wordsPerMinute: number = 200): number {
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, '');
  // Count words
  const words = text.trim().split(/\s+/).length;
  // Calculate minutes
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Format reading time nicely
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

/**
 * Placeholder image URL (LQIP - Low Quality Image Placeholder)
 * Returns a small, blurred placeholder while image loads
 */
export function getLQIPUrl(width: number = 10, height: number = 10): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='%23f0f0f0' width='${width}' height='${height}'/%3E%3C/svg%3E`;
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').includes('webp');
}

/**
 * Check if browser supports AVIF
 */
export function supportsAVIF(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  try {
    return canvas.toDataURL('image/avif').includes('avif');
  } catch {
    return false;
  }
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(
  jpegUrl: string,
  webpUrl?: string,
  avifUrl?: string
): { src: string; type: 'avif' | 'webp' | 'jpeg' } {
  if (avifUrl && supportsAVIF()) return { src: avifUrl, type: 'avif' };
  if (webpUrl && supportsWebP()) return { src: webpUrl, type: 'webp' };
  return { src: jpegUrl, type: 'jpeg' };
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImages(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return;
  }

  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
}

/**
 * Pre-load critical images
 */
export function preloadImage(src: string): void {
  if (typeof window === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

/**
 * Prefetch images
 */
export function prefetchImage(src: string): void {
  if (typeof window === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = src;
  document.head.appendChild(link);
}

/**
 * Cache-busting with timestamp
 */
export function addCacheBuster(url: string, timestamp?: number): string {
  if (!url) return url;
  const time = timestamp || Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${time}`;
}

/**
 * Get image dimensions while respecting max constraints
 */
export function getResponsiveDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 1200,
  maxHeight: number = 800
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

export default {
  generateSrcSet,
  addImageQuality,
  toWebP,
  toAVIF,
  responsiveSizes,
  getAspectRatioPadding,
  calculateReadingTime,
  formatReadingTime,
  getLQIPUrl,
  supportsWebP,
  supportsAVIF,
  getOptimalFormat,
  lazyLoadImages,
  preloadImage,
  prefetchImage,
  addCacheBuster,
  getResponsiveDimensions,
};
