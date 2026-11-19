/**
 * DevVault — Universal Website Metadata Provider
 * 
 * Default fallback provider that extracts Open Graph, Twitter Cards,
 * and HTML metadata from standard web pages using the safe fetcher and HTML parser.
 */

import { parseHtmlMetadata } from '../metadata-parser';
import { safeFetch } from '../safe-fetch';
import { MetadataExtractionOptions, NormalizedMetadata } from '../types';
import { MetadataProvider } from './types';

export class WebsiteProvider implements MetadataProvider {
  readonly name = 'website';
  readonly priority = 0; // Universal fallback

  /**
   * Accepts all valid web URLs.
   */
  supports(_url: URL): boolean {
    return true;
  }

  /**
   * Safely fetches the remote page and parses its HTML metadata.
   */
  async extract(
    url: URL,
    options?: MetadataExtractionOptions
  ): Promise<NormalizedMetadata> {
    const fetchResult = await safeFetch(url.href, {
      timeoutMs: options?.timeoutMs,
      maxRedirects: options?.maxRedirects,
      maxBodySizeBytes: options?.maxBodySizeBytes,
    });

    const metadata = parseHtmlMetadata(
      fetchResult.html,
      url.href,
      fetchResult.finalUrl
    );

    return metadata;
  }
}

export const websiteProvider = new WebsiteProvider();
