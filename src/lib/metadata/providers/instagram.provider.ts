/**
 * DevVault — Instagram Metadata Provider
 * 
 * Best-effort, compliant metadata extractor for Instagram posts, reels, and videos.
 * Uses official Meta oEmbed when configured with server credentials, falling back
 * to public HTML metadata or returning manual_required when gated by login wall.
 */

import { MetadataExtractionOptions, NormalizedMetadata } from '../types';
import { oEmbedClient, sanitizeMediaUrl } from './oembed.client';
import { MetadataProvider } from './types';
import { websiteProvider } from './website.provider';

const SHORTCODE_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Parses Instagram post, reel, or TV shortcodes.
 */
export function parseInstagramUrl(url: URL): {
  shortcode: string;
  kind: 'post' | 'reel' | 'tv';
} | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'instagram.com') {
    return null;
  }

  const match = url.pathname.match(/^\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return null;
  }

  const shortcode = match[1];
  if (!SHORTCODE_REGEX.test(shortcode)) {
    return null;
  }

  let kind: 'post' | 'reel' | 'tv' = 'post';
  if (url.pathname.includes('/reel')) {
    kind = 'reel';
  } else if (url.pathname.includes('/tv')) {
    kind = 'tv';
  }

  return { shortcode, kind };
}

export class InstagramProvider implements MetadataProvider {
  readonly name = 'instagram';
  readonly priority = 15;

  /**
   * Matches Instagram posts, reels, and video links.
   */
  supports(url: URL): boolean {
    return parseInstagramUrl(url) !== null;
  }

  /**
   * Best-effort extraction with official Meta oEmbed or website fallback.
   */
  async extract(
    url: URL,
    options?: MetadataExtractionOptions
  ): Promise<NormalizedMetadata> {
    const parsed = parseInstagramUrl(url);
    const sourceUrl = url.href;

    if (!parsed) {
      return websiteProvider.extract(url, options);
    }

    const { shortcode, kind } = parsed;
    const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
    const warnings: string[] = [];

    let title: string | null = null;
    let author: string | null = null;
    let image: string | null = null;
    let description: string | null = null;

    // 1. Check for official Meta App Token in server environment (never leaked)
    const metaToken =
      process.env.META_APP_TOKEN ||
      process.env.INSTAGRAM_APP_TOKEN ||
      (process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET
        ? `${process.env.INSTAGRAM_APP_ID}|${process.env.INSTAGRAM_APP_SECRET}`
        : null);

    if (metaToken) {
      try {
        const oembed = await oEmbedClient.fetchOEmbed(
          'https://graph.facebook.com/v19.0/instagram_oembed',
          canonicalUrl,
          { access_token: metaToken }
        );

        title = oembed.title || null;
        author = oembed.author_name || null;
        image = sanitizeMediaUrl(oembed.thumbnail_url);
      } catch (oembedErr) {
        warnings.push(`Official Meta oEmbed failed: ${(oembedErr as Error).message}`);
      }
    } else {
      warnings.push(
        'Meta API credentials (META_APP_TOKEN) not configured; attempting public metadata extraction.'
      );
    }

    // 2. Fallback: Public HTML / Open Graph extraction
    if (!title || !image) {
      try {
        const webMeta = await websiteProvider.extract(url, options);
        if (!title && webMeta.title) title = webMeta.title;
        if (!description && webMeta.description) description = webMeta.description;
        if (!image && webMeta.image) image = webMeta.image;
        if (!author && webMeta.author) author = webMeta.author;
      } catch (webErr) {
        warnings.push(`Public HTML extraction failed: ${(webErr as Error).message}`);
      }
    }

    // 3. Status Assessment: Detect login-wall restriction
    let extractionStatus: NormalizedMetadata['extractionStatus'] = 'manual_required';
    let confidence = 0.3;

    // If Instagram redirected to login or title is generic login text
    const isLoginGated =
      !title ||
      title.toLowerCase().includes('login') ||
      title.toLowerCase().includes('log in') ||
      title.toLowerCase().includes('page not found');

    if (!isLoginGated && title) {
      extractionStatus = image ? 'success' : 'partial';
      confidence = image ? 0.85 : 0.6;
    } else {
      title = `Instagram ${kind === 'reel' ? 'Reel' : kind === 'tv' ? 'Video' : 'Post'} (${shortcode})`;
      extractionStatus = 'manual_required';
      warnings.push(
        'Instagram requires authentication to view full details. Please enter title and description manually.'
      );
    }

    return {
      title,
      description,
      image,
      siteName: 'Instagram',
      sourceUrl,
      canonicalUrl,
      platform: 'INSTAGRAM',
      contentType: kind === 'reel' || kind === 'tv' ? 'video' : 'photo',
      author,
      publishedAt: null,
      extractionStatus,
      confidence,
      extractedAt: new Date().toISOString(),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const instagramProvider = new InstagramProvider();
