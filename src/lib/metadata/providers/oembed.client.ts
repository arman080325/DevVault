/**
 * DevVault — Reusable Secure oEmbed Client
 * 
 * Interacts with trusted oEmbed endpoints using connection-level IP pinning,
 * response schema validation, untrusted HTML isolation, and strict endpoint whitelisting.
 */

import { InvalidURLError, ProviderError } from '../errors';
import { safeFetchJson } from '../safe-fetch';
import { validateUrlStructure } from '../url-validator';

export interface OEmbedResponse {
  type: 'video' | 'photo' | 'rich' | 'link' | string;
  version?: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  width?: number;
  height?: number;
}

/**
 * Curated list of fixed, trusted oEmbed endpoint origins and paths.
 * Prevents SSRF / open-endpoint manipulation via user-supplied parameters.
 */
const TRUSTED_OEMBED_ENDPOINTS = new Set([
  'https://www.youtube.com/oembed',
  'https://graph.facebook.com/v19.0/instagram_oembed',
  'https://graph.facebook.com/v18.0/instagram_oembed',
]);

/**
 * Validates that an image or resource URL is well-formed, uses http/https,
 * and contains no script schemes.
 */
export function sanitizeMediaUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // Malformed URL
  }
  return null;
}

export class OEmbedClient {
  /**
   * Fetches and validates an oEmbed resource from a fixed, trusted provider endpoint.
   */
  async fetchOEmbed(
    trustedEndpoint: string,
    resourceUrl: string,
    extraParams?: Record<string, string>
  ): Promise<OEmbedResponse> {
    // 1. Verify that the requested endpoint is in our curated whitelist
    const endpointBase = trustedEndpoint.split('?')[0];
    if (!TRUSTED_OEMBED_ENDPOINTS.has(endpointBase)) {
      throw new ProviderError(
        'oEmbed',
        `Access to untrusted oEmbed endpoint "${trustedEndpoint}" is prohibited.`
      );
    }

    // 2. Validate the source resource URL
    const validatedResource = validateUrlStructure(resourceUrl);

    // 3. Construct fixed oEmbed URL with parameters
    const targetUrl = new URL(trustedEndpoint);
    targetUrl.searchParams.set('url', validatedResource.href);
    targetUrl.searchParams.set('format', 'json');

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value) {
          targetUrl.searchParams.set(key, value);
        }
      }
    }

    // 4. Securely fetch JSON with connection-level IP pinning and size limits (256KB max)
    const result = await safeFetchJson<Record<string, unknown>>(targetUrl.href, {
      maxBodySizeBytes: 256 * 1024,
      timeoutMs: 6000,
    });

    const data = result.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ProviderError('oEmbed', 'oEmbed endpoint returned a non-object payload.');
    }

    // 5. Schema validation and field sanitation
    const type = typeof data.type === 'string' ? data.type : 'rich';
    const title = typeof data.title === 'string' ? data.title.trim() : undefined;
    const author_name = typeof data.author_name === 'string' ? data.author_name.trim() : undefined;
    const author_url = sanitizeMediaUrl(typeof data.author_url === 'string' ? data.author_url : undefined) || undefined;
    const provider_name = typeof data.provider_name === 'string' ? data.provider_name.trim() : undefined;
    const provider_url = sanitizeMediaUrl(typeof data.provider_url === 'string' ? data.provider_url : undefined) || undefined;
    const thumbnail_url = sanitizeMediaUrl(typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined) || undefined;

    // Treat returned HTML strictly as untrusted string — never execute or inject
    const html = typeof data.html === 'string' ? data.html : undefined;

    return {
      type,
      version: typeof data.version === 'string' ? data.version : undefined,
      title,
      author_name,
      author_url,
      provider_name,
      provider_url,
      thumbnail_url,
      thumbnail_width: typeof data.thumbnail_width === 'number' ? data.thumbnail_width : undefined,
      thumbnail_height: typeof data.thumbnail_height === 'number' ? data.thumbnail_height : undefined,
      html,
    };
  }
}

export const oEmbedClient = new OEmbedClient();
