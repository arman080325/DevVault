/**
 * DevVault — YouTube Metadata Provider
 * 
 * Extracts rich metadata for YouTube videos, Shorts, and Live streams
 * using official public oEmbed with website HTML and YouTube Data API v3 fallback.
 */

import { safeFetchJson } from '../safe-fetch';
import { MetadataExtractionOptions, NormalizedMetadata } from '../types';
import { oEmbedClient, sanitizeMediaUrl } from './oembed.client';
import { MetadataProvider } from './types';
import { websiteProvider } from './website.provider';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts and validates an 11-character YouTube video ID.
 */
export function extractYouTubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be') {
    const candidate = url.pathname.slice(1).split('/')[0];
    return candidate && VIDEO_ID_REGEX.test(candidate) ? candidate : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      return v && VIDEO_ID_REGEX.test(v) ? v : null;
    }
    const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export class YouTubeProvider implements MetadataProvider {
  readonly name = 'youtube';
  readonly priority = 20;

  /**
   * Matches YouTube watch, shorts, embed, and live stream URLs.
   */
  supports(url: URL): boolean {
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return YOUTUBE_HOSTS.has(host) && extractYouTubeVideoId(url) !== null;
  }

  /**
   * Extracts metadata via oEmbed with website HTML and optional API v3 fallback.
   */
  async extract(
    url: URL,
    options?: MetadataExtractionOptions
  ): Promise<NormalizedMetadata> {
    const videoId = extractYouTubeVideoId(url);
    const sourceUrl = url.href;

    if (!videoId) {
      // If no valid video ID could be parsed, fallback to universal website provider
      return websiteProvider.extract(url, options);
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const warnings: string[] = [];

    let title: string | null = null;
    let author: string | null = null;
    let image: string | null = null;
    let description: string | null = null;
    let publishedAt: string | null = null;

    // 1. Primary: Official Public YouTube oEmbed
    try {
      const oembed = await oEmbedClient.fetchOEmbed(
        'https://www.youtube.com/oembed',
        canonicalUrl
      );

      title = oembed.title || null;
      author = oembed.author_name || null;
      image =
        sanitizeMediaUrl(oembed.thumbnail_url) ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    } catch (oembedErr) {
      warnings.push(`oEmbed extraction failed: ${(oembedErr as Error).message}`);
    }

    // 2. Optional: Server-Side YouTube Data API v3 enrichment (if configured)
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey && (!title || !description)) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${encodeURIComponent(apiKey)}`;
        const apiRes = await safeFetchJson<{
          items?: Array<{
            snippet?: {
              title?: string;
              description?: string;
              channelTitle?: string;
              publishedAt?: string;
              thumbnails?: {
                maxres?: { url?: string };
                high?: { url?: string };
              };
            };
          }>;
        }>(apiUrl, { timeoutMs: 4000 });

        const item = apiRes.data.items?.[0]?.snippet;
        if (item) {
          if (!title && item.title) title = item.title.trim();
          if (!author && item.channelTitle) author = item.channelTitle.trim();
          if (item.description) description = item.description.trim();
          if (item.publishedAt) publishedAt = item.publishedAt;
          if (!image) {
            image =
              sanitizeMediaUrl(item.thumbnails?.maxres?.url) ||
              sanitizeMediaUrl(item.thumbnails?.high?.url) ||
              null;
          }
        }
      } catch (apiErr) {
        // Never leak API key or failure to client
        warnings.push('YouTube Data API enrichment skipped or unavailable.');
      }
    }

    // 3. Fallback: If title or image are missing, fall back to website HTML parsing
    if (!title || !image) {
      try {
        const webMeta = await websiteProvider.extract(url, options);
        if (!title && webMeta.title) title = webMeta.title;
        if (!description && webMeta.description) description = webMeta.description;
        if (!image && webMeta.image) image = webMeta.image;
        if (!author && webMeta.author) author = webMeta.author;
        if (!publishedAt && webMeta.publishedAt) publishedAt = webMeta.publishedAt;
      } catch (webErr) {
        warnings.push(`Website fallback failed: ${(webErr as Error).message}`);
      }
    }

    // Ensure fallback thumbnail is provided if videoId is valid
    if (!image && videoId) {
      image = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    // Determine status & confidence
    let extractionStatus: NormalizedMetadata['extractionStatus'] = 'manual_required';
    let confidence = 0.4;

    if (title && image) {
      extractionStatus = 'success';
      confidence = description ? 0.95 : 0.85;
    } else if (title) {
      extractionStatus = 'partial';
      confidence = 0.6;
      warnings.push('Video thumbnail could not be confirmed.');
    } else {
      warnings.push('YouTube video may be private, age-restricted, or removed.');
    }

    return {
      title,
      description,
      image,
      siteName: 'YouTube',
      sourceUrl,
      canonicalUrl,
      platform: 'YOUTUBE',
      contentType: 'video',
      author,
      publishedAt,
      extractionStatus,
      confidence,
      extractedAt: new Date().toISOString(),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const youtubeProvider = new YouTubeProvider();
