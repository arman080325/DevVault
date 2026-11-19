/**
 * DevVault — Normalized Metadata Extraction Types
 * 
 * Provider-independent schema for extracted web and platform metadata.
 */

export type ExtractionStatus =
  | "success"
  | "partial"
  | "manual_required"
  | "unsupported"
  | "failed";

export type DetectedPlatform =
  | "WEBSITE"
  | "GITHUB"
  | "YOUTUBE"
  | "INSTAGRAM"
  | "DOCS"
  | "DESIGN"
  | "TOOL";

export interface NormalizedMetadata {
  /** Clean, human-readable title */
  title: string | null;
  /** Summary or description of the content */
  description: string | null;
  /** Primary preview image, Open Graph image or thumbnail */
  image: string | null;
  /** Name of the publishing site or organization */
  siteName: string | null;
  /** Original URL supplied by user */
  sourceUrl: string;
  /** Canonical URL declared by the document */
  canonicalUrl: string | null;
  /** Detected platform kind */
  platform: DetectedPlatform;
  /** Semantic content type (e.g., "article", "video", "website", "documentation") */
  contentType: string | null;
  /** Author or creator name */
  author: string | null;
  /** ISO 8601 published date if available */
  publishedAt: string | null;
  /** Overall status of the extraction pipeline */
  extractionStatus: ExtractionStatus;
  /** Confidence score between 0.0 and 1.0 */
  confidence: number;
  /** ISO 8601 timestamp of when extraction was completed */
  extractedAt: string;
  /** Non-fatal warnings encountered during extraction */
  warnings?: string[];
}

export interface MetadataExtractionOptions {
  /** Maximum network request duration in milliseconds (default: 6000ms) */
  timeoutMs?: number;
  /** Maximum number of HTTP redirects to follow (default: 5) */
  maxRedirects?: number;
  /** Maximum response body size to stream in bytes (default: 1048576 = 1MB) */
  maxBodySizeBytes?: number;
  /** Skip cache lookup and force fresh extraction */
  skipCache?: boolean;
  /** Optional user identifier for rate-limiting and audit */
  userId?: string;
}
