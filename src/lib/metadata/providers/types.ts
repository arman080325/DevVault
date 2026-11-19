/**
 * DevVault — Metadata Provider Interface
 * 
 * Defines the contract for universal and specialized metadata extractors.
 */

import { MetadataExtractionOptions, NormalizedMetadata } from '../types';

export interface MetadataProvider {
  /** Unique provider identifier */
  readonly name: string;

  /**
   * Execution priority. Higher numbers take precedence.
   * Universal website provider uses priority 0 as fallback.
   */
  readonly priority: number;

  /**
   * Evaluates whether this provider handles the given URL.
   */
  supports(url: URL): boolean;

  /**
   * Executes metadata extraction and returns normalized metadata.
   */
  extract(
    url: URL,
    options?: MetadataExtractionOptions
  ): Promise<NormalizedMetadata>;
}
