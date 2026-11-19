/**
 * DevVault — Metadata HTML Parser
 * 
 * Cheerio-based parser extracting Open Graph, Twitter Cards, Schema.org JSON-LD,
 * and semantic HTML metadata with confidence scoring and entity resolution.
 */

import * as cheerio from 'cheerio';
import { DetectedPlatform, ExtractionStatus, NormalizedMetadata } from './types';

interface ParsedJsonLd {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  author?: string;
  publishedAt?: string;
  contentType?: string;
}

/**
 * Detect platform category from hostname and canonical URL.
 */
export function detectPlatform(hostname: string): DetectedPlatform {
  const host = hostname.toLowerCase();

  if (host === 'github.com' || host.endsWith('.github.com') || host === 'gist.github.com') {
    return 'GITHUB';
  }
  if (
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtu.be'
  ) {
    return 'YOUTUBE';
  }
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return 'INSTAGRAM';
  }
  if (
    host.includes('docs.') ||
    host.includes('documentation') ||
    host.endsWith('.gitbook.io') ||
    host.endsWith('.readthedocs.io') ||
    host.endsWith('.gitbook.com')
  ) {
    return 'DOCS';
  }
  if (
    host === 'figma.com' ||
    host.endsWith('.figma.com') ||
    host === 'dribbble.com' ||
    host === 'behance.net'
  ) {
    return 'DESIGN';
  }

  return 'WEBSITE';
}

/**
 * Safely resolves a potentially relative URL against a base URL.
 */
function resolveUrl(relativeOrAbsolute: string | undefined | null, baseUrl: string): string | null {
  if (!relativeOrAbsolute || typeof relativeOrAbsolute !== 'string') return null;
  const trimmed = relativeOrAbsolute.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return null;

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clean and normalize text strings (removes line breaks, collapses whitespace, trims).
 */
function cleanText(text: string | undefined | null): string | null {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Parses ISO 8601 or common date formats safely.
 */
function parseDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    const parsed = new Date(dateStr.trim());
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // Ignore invalid date parsing
  }
  return null;
}

/**
 * Extracts and consolidates JSON-LD structured data from document scripts.
 */
function extractJsonLd($: cheerio.CheerioAPI, baseUrl: string): ParsedJsonLd {
  const result: ParsedJsonLd = {};

  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const raw = $(elem).html();
      if (!raw) return;

      const data = JSON.parse(raw);
      const objects = Array.isArray(data)
        ? data
        : data['@graph'] && Array.isArray(data['@graph'])
        ? data['@graph']
        : [data];

      for (const obj of objects) {
        if (!obj || typeof obj !== 'object') continue;

        // Title / Headline
        if (!result.title && (obj.headline || obj.name)) {
          result.title = cleanText(obj.headline || obj.name) || undefined;
        }

        // Description
        if (!result.description && obj.description) {
          result.description = cleanText(obj.description) || undefined;
        }

        // Image
        if (!result.image && obj.image) {
          let imageUrl: string | null = null;
          if (typeof obj.image === 'string') {
            imageUrl = obj.image;
          } else if (Array.isArray(obj.image) && typeof obj.image[0] === 'string') {
            imageUrl = obj.image[0];
          } else if (typeof obj.image === 'object' && obj.image.url) {
            imageUrl = obj.image.url;
          }
          if (imageUrl) {
            result.image = resolveUrl(imageUrl, baseUrl) || undefined;
          }
        }

        // Publisher / Site Name
        if (!result.siteName && obj.publisher && typeof obj.publisher === 'object') {
          result.siteName = cleanText(obj.publisher.name) || undefined;
        }

        // Author
        if (!result.author && obj.author) {
          if (typeof obj.author === 'string') {
            result.author = cleanText(obj.author) || undefined;
          } else if (Array.isArray(obj.author) && obj.author[0]?.name) {
            result.author = cleanText(obj.author[0].name) || undefined;
          } else if (typeof obj.author === 'object' && obj.author.name) {
            result.author = cleanText(obj.author.name) || undefined;
          }
        }

        // Published Date
        if (!result.publishedAt && (obj.datePublished || obj.dateCreated)) {
          result.publishedAt = parseDate(obj.datePublished || obj.dateCreated) || undefined;
        }

        // Content Type
        if (!result.contentType && obj['@type']) {
          result.contentType = cleanText(String(obj['@type'])) || undefined;
        }
      }
    } catch {
      // Ignore JSON parse errors in invalid JSON-LD blocks
    }
  });

  return result;
}

/**
 * Parses raw HTML string and returns normalized metadata.
 */
export function parseHtmlMetadata(
  html: string,
  sourceUrl: string,
  finalUrl: string
): NormalizedMetadata {
  const $ = cheerio.load(html);
  const baseUrl = finalUrl || sourceUrl;
  const jsonLd = extractJsonLd($, baseUrl);

  // Helper to extract meta tag contents by property or name
  const getMeta = (...keys: string[]): string | null => {
    for (const key of keys) {
      const val =
        $(`meta[property="${key}"]`).attr('content') ||
        $(`meta[name="${key}"]`).attr('content') ||
        $(`meta[itemprop="${key}"]`).attr('content');
      if (val) return cleanText(val);
    }
    return null;
  };

  // 1. Title Priority: og:title -> twitter:title -> JSON-LD -> <title>
  const title =
    getMeta('og:title') ||
    getMeta('twitter:title') ||
    jsonLd.title ||
    cleanText($('title').first().text()) ||
    null;

  // 2. Description Priority: og:description -> twitter:description -> JSON-LD -> meta description
  const description =
    getMeta('og:description') ||
    getMeta('twitter:description') ||
    jsonLd.description ||
    getMeta('description') ||
    null;

  // 3. Image Priority: og:image -> twitter:image -> JSON-LD image -> rel="image_src"
  const rawImage =
    getMeta('og:image', 'og:image:url', 'og:image:secure_url') ||
    getMeta('twitter:image', 'twitter:image:src') ||
    jsonLd.image ||
    $('link[rel="image_src"]').attr('href') ||
    null;
  const image = resolveUrl(rawImage, baseUrl);

  // 4. Site Name Priority: og:site_name -> JSON-LD publisher -> hostname fallback
  let parsedHost = '';
  try {
    parsedHost = new URL(baseUrl).hostname;
  } catch {
    parsedHost = '';
  }

  const siteName =
    getMeta('og:site_name') ||
    jsonLd.siteName ||
    (parsedHost ? parsedHost.replace(/^www\./, '') : null);

  // 5. Canonical URL Priority: rel="canonical" -> og:url -> finalUrl
  const rawCanonical =
    $('link[rel="canonical"]').attr('href') ||
    getMeta('og:url') ||
    null;
  const canonicalUrl = resolveUrl(rawCanonical, baseUrl) || finalUrl;

  // 6. Platform Detection
  const platform = detectPlatform(parsedHost);

  // 7. Author Priority: meta author -> article:author -> JSON-LD -> twitter:creator
  const author =
    getMeta('author') ||
    getMeta('article:author') ||
    jsonLd.author ||
    getMeta('twitter:creator') ||
    null;

  // 8. Published Date: article:published_time -> JSON-LD -> meta date
  const rawDate =
    getMeta('article:published_time', 'publication_date', 'date', 'pubdate') ||
    jsonLd.publishedAt;
  const publishedAt = parseDate(rawDate);

  // 9. Semantic Content Type
  const contentType =
    getMeta('og:type') ||
    jsonLd.contentType ||
    (platform === 'DOCS' ? 'documentation' : 'website');

  // 10. Confidence Scoring (only rewards extracted document metadata, not URL fallbacks)
  let score = 0;
  if (title) score += 0.35;
  if (description) score += 0.25;
  if (image) score += 0.20;
  if (getMeta('og:site_name') || jsonLd.siteName || author) score += 0.10;
  if (publishedAt || rawCanonical) score += 0.10;
  const confidence = Math.min(1.0, Math.round(score * 100) / 100);

  // 11. Extraction Status
  let extractionStatus: ExtractionStatus = 'manual_required';
  if (title && (description || image)) {
    extractionStatus = 'success';
  } else if (title) {
    extractionStatus = 'partial';
  }

  return {
    title,
    description,
    image,
    siteName,
    sourceUrl,
    canonicalUrl,
    platform,
    contentType,
    author,
    publishedAt,
    extractionStatus,
    confidence,
    extractedAt: new Date().toISOString(),
  };
}
