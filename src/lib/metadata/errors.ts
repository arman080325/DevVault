/**
 * DevVault — Metadata Extraction Engine Errors
 * 
 * Typed error hierarchy for SSRF protection, network limits,
 * validation, and extraction failures.
 */

export type MetadataErrorCode =
  | 'INVALID_URL'
  | 'SSRF_DETECTED'
  | 'TIMEOUT'
  | 'CONTENT_TYPE_REJECTED'
  | 'SIZE_LIMIT_EXCEEDED'
  | 'REDIRECT_LIMIT_EXCEEDED'
  | 'HTTP_ERROR'
  | 'PARSING_ERROR'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED';

export class MetadataError extends Error {
  readonly code: MetadataErrorCode;
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(message: string, code: MetadataErrorCode, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/** Thrown when URL format or scheme is invalid */
export class InvalidURLError extends MetadataError {
  constructor(message: string = 'The provided URL is invalid or uses an unsupported scheme.') {
    super(message, 'INVALID_URL', 400);
  }
}

/** Thrown when a URL resolves to private, loopback, or cloud-metadata network addresses */
export class SSRFError extends MetadataError {
  constructor(message: string = 'Access to the specified network address is prohibited for security reasons.') {
    super(message, 'SSRF_DETECTED', 400);
  }
}

/** Thrown when fetching exceeds the configured timeout threshold */
export class TimeoutError extends MetadataError {
  constructor(message: string = 'The request to fetch page metadata timed out.') {
    super(message, 'TIMEOUT', 504);
  }
}

/** Thrown when response Content-Type is not text/html or compatible markup */
export class ContentTypeError extends MetadataError {
  constructor(message: string = 'Unsupported content type. Only HTML documents are supported.') {
    super(message, 'CONTENT_TYPE_REJECTED', 422);
  }
}

/** Thrown when response body exceeds maximum allowed size (e.g., 1MB) */
export class SizeLimitError extends MetadataError {
  constructor(message: string = 'The response payload exceeds the maximum allowed size limit (1MB).') {
    super(message, 'SIZE_LIMIT_EXCEEDED', 422);
  }
}

/** Thrown when maximum allowed redirects are exceeded */
export class RedirectLimitError extends MetadataError {
  constructor(message: string = 'Too many redirects encountered while resolving metadata.') {
    super(message, 'REDIRECT_LIMIT_EXCEEDED', 400);
  }
}

/** Thrown when remote server returns a non-2xx HTTP status */
export class HTTPError extends MetadataError {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message, 'HTTP_ERROR', httpStatus >= 400 && httpStatus < 500 ? 422 : 502);
    this.httpStatus = httpStatus;
  }
}

/** Thrown when provider encounters an unrecoverable extraction failure */
export class ProviderError extends MetadataError {
  readonly providerName: string;

  constructor(providerName: string, message: string) {
    super(`[${providerName}] ${message}`, 'PROVIDER_ERROR', 500);
    this.providerName = providerName;
  }
}

/** Thrown when rate limit for extraction is exceeded */
export class RateLimitError extends MetadataError {
  constructor(message: string = 'Too many metadata requests. Please slow down.') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}
