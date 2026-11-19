/**
 * DevVault — Core Metadata Extractor Engine
 * 
 * Coordinates URL validation, cache resolution, provider selection,
 * extraction execution, and persistence caching.
 */

import { MetadataError, ProviderError } from './errors';
import { metadataCache } from './metadata-cache';
import { MetadataProvider } from './providers/types';
import { websiteProvider } from './providers/website.provider';
import { MetadataExtractionOptions, NormalizedMetadata } from './types';
import { validateUrlStructure } from './url-validator';

export class MetadataExtractor {
  private providers: MetadataProvider[] = [];

  constructor() {
    // Register the universal website fallback provider
    this.registerProvider(websiteProvider);
  }

  /**
   * Registers a provider into the pipeline, maintaining priority descending order.
   */
  registerProvider(provider: MetadataProvider): void {
    // Remove if already registered
    this.providers = this.providers.filter((p) => p.name !== provider.name);
    this.providers.push(provider);
    // Sort descending by priority
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Returns list of currently registered provider names.
   */
  getRegisteredProviders(): string[] {
    return this.providers.map((p) => p.name);
  }

  /**
   * Main entry point for metadata extraction.
   */
  async extract(
    rawUrl: string,
    options?: MetadataExtractionOptions
  ): Promise<NormalizedMetadata> {
    // 1. Strict early URL validation
    const parsedUrl = validateUrlStructure(rawUrl);

    // 2. Cache Lookup
    if (!options?.skipCache) {
      const cached = metadataCache.get(rawUrl);
      if (cached) {
        return cached;
      }
    }

    // 3. Provider Selection
    const provider = this.providers.find((p) => p.supports(parsedUrl));
    if (!provider) {
      throw new ProviderError(
        'Engine',
        `No suitable metadata provider found for URL "${rawUrl}".`
      );
    }

    // 4. Execution
    try {
      const result = await provider.extract(parsedUrl, options);

      // 5. Store in cache if status is valid
      if (result.extractionStatus !== 'failed') {
        metadataCache.set(rawUrl, result);
      }

      return result;
    } catch (err) {
      if (err instanceof MetadataError) {
        throw err;
      }
      throw new ProviderError(
        provider.name,
        err instanceof Error ? err.message : 'Unknown extraction failure'
      );
    }
  }
}

/**
 * Global singleton metadata extractor.
 */
export const metadataExtractor = new MetadataExtractor();
