/**
 * YouTube URL utilities for video embedding and validation.
 */

/**
 * Extracts the video ID from various YouTube URL formats.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 *
 * @param url - YouTube URL in any common format
 * @returns Video ID string or null if not a valid YouTube URL
 *
 * @example
 * extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
 * extractVideoId('https://youtu.be/dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
 * extractVideoId('https://invalid.com/video') // null
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validates if a URL is a valid YouTube video URL.
 *
 * @param url - URL to validate
 * @returns true if the URL is a valid YouTube video URL
 *
 * @example
 * isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ') // true
 * isValidYouTubeUrl('https://example.com') // false
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Converts a YouTube watch URL to an embed URL.
 * Embed URLs are used in iframes for inline video playback.
 *
 * @param url - YouTube URL in any common format
 * @returns Embed URL string or null if not a valid YouTube URL
 *
 * @example
 * toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // 'https://www.youtube.com/embed/dQw4w9WgXcQ'
 */
export function toEmbedUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Converts a YouTube URL to a thumbnail URL.
 * Returns the medium quality thumbnail (mqdefault).
 *
 * @param url - YouTube URL in any common format
 * @returns Thumbnail URL string or null if not a valid YouTube URL
 *
 * @example
 * toThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
 */
export function toThumbnailUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
