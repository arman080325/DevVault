/**
 * DevVault — Core Metadata Extractor Engine
 * 
 * Coordinates URL validation, cache resolution, priority-based provider selection,
 * specialized platform execution, graceful fallback, and field-level metadata merging.
 */

import { MetadataError, ProviderError } from './errors';
import { metadataCache } from './metadata-cache';
import { githubProvider } from './providers/github.provider';
import { instagramProvider } from './providers/instagram.provider';
import { MetadataProvider } from './providers/types';
import { websiteProvider } from './providers/website.provider';
import { youtubeProvider } from './providers/youtube.provider';
import { MetadataExtractionOptions, NormalizedMetadata } from './types';
import { validateUrlStructure } from './url-validator';

/**
 * Merges primary provider metadata with fallback metadata using strict precedence:
 * Never replaces an existing non-empty value with a null or lower-quality value.
 */
export function mergeMetadata(
  primary: NormalizedMetadata,
  fallback: NormalizedMetadata
): NormalizedMetadata {
  const mergedWarnings = Array.from(
    new Set([...(primary.warnings || []), ...(fallback.warnings || [])])
  );

  const title = primary.title || fallback.title;
  const description = primary.description || fallback.description;
  const image = primary.image || fallback.image;
  const author = primary.author || fallback.author;
  const publishedAt = primary.publishedAt || fallback.publishedAt;
  const siteName = primary.siteName || fallback.siteName;

  // Derive status from merged availability
  let extractionStatus = primary.extractionStatus;
  if (extractionStatus === 'manual_required' && title && (description || image)) {
    extractionStatus = 'partial';
  }

  const confidence = Math.min(
    1.0,
    Math.max(primary.confidence, fallback.confidence)
  );

  return {
    title,
    description,
    image,
    siteName,
    sourceUrl: primary.sourceUrl,
    canonicalUrl: primary.canonicalUrl || fallback.canonicalUrl,
    platform: primary.platform !== 'WEBSITE' ? primary.platform : fallback.platform,
    contentType: primary.contentType || fallback.contentType,
    author,
    publishedAt,
    extractionStatus,
    confidence,
    extractedAt: primary.extractedAt,
    warnings: mergedWarnings.length > 0 ? mergedWarnings : undefined,
  };
}

export class MetadataExtractor {
  private providers: MetadataProvider[] = [];

  constructor() {
    // Register specialized providers in priority order
    this.registerProvider(githubProvider);     // Priority 30
    this.registerProvider(youtubeProvider);    // Priority 20
    this.registerProvider(instagramProvider);  // Priority 15
    this.registerProvider(websiteProvider);    // Priority 0 (Fallback)
  }

  /**
   * Registers a provider into the pipeline, maintaining priority descending order.
   */
  registerProvider(provider: MetadataProvider): void {
    this.providers = this.providers.filter((p) => p.name !== provider.name);
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Returns list of currently registered provider names in priority order.
   */
  getRegisteredProviders(): string[] {
    return this.providers.map((p) => p.name);
  }

  /**
   * Returns a specific registered provider by name.
   */
  getProvider(name: string): MetadataProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  /**
   * Main entry point for metadata extraction with priority selection and fallback.
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

    // 3. Provider Selection: Pick highest-priority matching provider
    const provider = this.providers.find((p) => p.supports(parsedUrl));
    if (!provider) {
      throw new ProviderError(
        'Engine',
        `No suitable metadata provider found for URL "${rawUrl}".`
      );
    }

    // 4. Execution with graceful fallback
    let result: NormalizedMetadata;

    try {
      result = await provider.extract(parsedUrl, options);

      // If a specialized provider succeeded but has incomplete description/image,
      // optionally merge with universal website extraction if not already done
      if (
        provider.name !== 'website' &&
        (!result.description || !result.image) &&
        result.extractionStatus !== 'failed'
      ) {
        try {
          const webFallback = await websiteProvider.extract(parsedUrl, options);
          result = mergeMetadata(result, webFallback);
        } catch {
          // Fallback failure is non-fatal
        }
      }
    } catch (primaryErr) {
      // If specialized provider failed with an error, fall back to universal website provider
      if (provider.name !== 'website') {
        try {
          const fallbackResult = await websiteProvider.extract(parsedUrl, options);
          const warnings = [
            `Specialized [${provider.name}] extraction failed (${(primaryErr as Error).message}); fell back to universal extraction.`,
            ...(fallbackResult.warnings || []),
          ];
          result = {
            ...fallbackResult,
            warnings,
          };
        } catch {
          // If website fallback also failed, re-throw the original error
          if (primaryErr instanceof MetadataError) {
            throw primaryErr;
          }
          throw new ProviderError(
            provider.name,
            primaryErr instanceof Error ? primaryErr.message : 'Extraction failure'
          );
        }
      } else {
        if (primaryErr instanceof MetadataError) {
          throw primaryErr;
        }
        throw new ProviderError(
          provider.name,
          primaryErr instanceof Error ? primaryErr.message : 'Extraction failure'
        );
      }
    }

    // 5. Cache result if status is not 'failed'
    if (result.extractionStatus !== 'failed') {
      metadataCache.set(rawUrl, result);
    }

    return result;
  }
}

/**
 * Global singleton metadata extractor.
 */
export const metadataExtractor = new MetadataExtractor();
