/**
 * DevVault — Safe HTTP Fetcher with Connection-Level IP Pinning
 * 
 * SSRF-hardened HTTP client using Undici Agent with socket-level DNS interception,
 * connection IP pinning, manual redirect re-validation, persistent stream timeout,
 * Content-Type enforcement, and streaming body size caps.
 */

import dns from 'dns';
import net from 'net';
import { Agent, buildConnector, fetch as undiciFetch } from 'undici';
import {
  ContentTypeError,
  HTTPError,
  InvalidURLError,
  MetadataError,
  RedirectLimitError,
  SizeLimitError,
  SSRFError,
  TimeoutError,
} from './errors';
import { isForbiddenIP, validateUrlStructure } from './url-validator';

export interface SafeFetchOptions {
  /** Maximum time allowed for all hops combined in ms (default: 6000) */
  timeoutMs?: number;
  /** Maximum number of redirects allowed (default: 5) */
  maxRedirects?: number;
  /** Maximum body size allowed in bytes (default: 1,048,576 = 1MB) */
  maxBodySizeBytes?: number;
  /** User-Agent header */
  userAgent?: string;
}

export interface SafeFetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
  redirectCount: number;
}

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BODY_SIZE_BYTES = 1024 * 1024; // 1MB
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; DevVaultBot/1.0; +https://devvault.app/bot)';

/**
 * Creates an Undici connector that intercepts DNS resolution at the exact moment
 * of outbound TCP/TLS socket creation.
 * 
 * - Resolves all DNS records for the host.
 * - Inspects every returned IP against SSRF blacklists.
 * - Pins the connection strictly to the first validated IP address.
 * - Preserves TLS Server Name Indication (SNI) and HTTP Host header.
 * 
 * This completely eliminates the TOCTOU / DNS rebinding window.
 */
function createSafeConnector() {
  const safeLookup: net.LookupFunction = (
    hostname: string,
    _opts: dns.LookupOptions,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string | dns.LookupAddress[],
      family?: number
    ) => void
  ) => {
    const cleanHost =
      hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname.toLowerCase().trim();

    // 1. Literal IP check
    const ipFamily = net.isIP(cleanHost);
    if (ipFamily !== 0) {
      if (isForbiddenIP(cleanHost)) {
        return callback(
          new SSRFError(`Access to IP address "${cleanHost}" is prohibited.`) as unknown as NodeJS.ErrnoException,
          ''
        );
      }
      return callback(null, [{ address: cleanHost, family: ipFamily }]);
    }

    // 2. Prohibited internal hostnames check
    if (
      cleanHost === 'localhost' ||
      cleanHost.endsWith('.localhost') ||
      cleanHost.endsWith('.local') ||
      cleanHost.endsWith('.internal') ||
      cleanHost === 'metadata.google.internal' ||
      cleanHost === 'instance-data'
    ) {
      return callback(
        new SSRFError(`Access to internal hostname "${cleanHost}" is prohibited.`) as unknown as NodeJS.ErrnoException,
        ''
      );
    }

    // 3. Socket-level DNS resolution
    dns.lookup(cleanHost, { all: true }, (err, addresses) => {
      if (err) {
        return callback(err, '');
      }

      if (!addresses || addresses.length === 0) {
        return callback(
          new InvalidURLError(`Unable to resolve hostname "${cleanHost}".`) as unknown as NodeJS.ErrnoException,
          ''
        );
      }

      // 4. Validate ALL returned IP addresses before socket dialing
      for (const record of addresses) {
        if (isForbiddenIP(record.address)) {
          return callback(
            new SSRFError(
              `Security violation: hostname "${cleanHost}" resolved to prohibited address "${record.address}".`
            ) as unknown as NodeJS.ErrnoException,
            ''
          );
        }
      }

      // 5. Pin connection to the first validated address
      const pinned = addresses[0];
      callback(null, [{ address: pinned.address, family: pinned.family }]);
    });
  };

  return buildConnector({
    lookup: safeLookup,
  });
}

/**
 * Shared Undici Agent instance configured with the secure connector.
 */
export const safeAgent = new Agent({
  connect: createSafeConnector(),
});

/**
 * Validates whether the content-type is an acceptable HTML/markup format.
 */
function isValidHtmlContentType(contentTypeHeader: string | null): boolean {
  if (!contentTypeHeader) {
    return true; // Will verify body markup in parser
  }
  const lower = contentTypeHeader.toLowerCase();
  return (
    lower.includes('text/html') ||
    lower.includes('application/xhtml+xml') ||
    lower.includes('text/xml')
  );
}

/**
 * Safely fetches a web page with connection-level IP pinning, streaming size limits,
 * multi-hop manual redirect validation, and persistent timeout protection.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBodySizeBytes = options.maxBodySizeBytes ?? DEFAULT_MAX_BODY_SIZE_BYTES;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  let currentUrl = targetUrl;
  let redirectCount = 0;
  const startTime = Date.now();

  while (true) {
    // 1. Validate URL structure on every hop (scheme, ports, credentials, dangerous hostnames)
    const validatedUrl = validateUrlStructure(currentUrl);
    const resolvedUrlString = validatedUrl.href;

    // 2. Compute remaining time budget across all hops
    const elapsed = Date.now() - startTime;
    const remainingTimeout = timeoutMs - elapsed;
    if (remainingTimeout <= 0) {
      throw new TimeoutError(`Request exceeded total timeout threshold of ${timeoutMs}ms.`);
    }

    const abortController = new AbortController();
    const timer = setTimeout(() => {
      abortController.abort();
    }, remainingTimeout);

    try {
      // 3. Connect via safeAgent (with connection-level IP pinning and DNS SSRF defense)
      let response: Response;
      try {
        response = (await undiciFetch(resolvedUrlString, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
          redirect: 'manual',
          signal: abortController.signal,
          dispatcher: safeAgent,
        })) as unknown as Response;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new TimeoutError(`Fetching "${resolvedUrlString}" timed out after ${timeoutMs}ms.`);
        }

        // Unwrap Undici error cause if present (e.g. SSRFError thrown inside connector)
        const cause = (err as { cause?: Error })?.cause;
        if (cause instanceof MetadataError) {
          throw cause;
        }
        if (cause instanceof Error && cause.name === 'AbortError') {
          throw new TimeoutError(`Fetching "${resolvedUrlString}" timed out after ${timeoutMs}ms.`);
        }
        if ((cause as NodeJS.ErrnoException)?.code === 'ENOTFOUND') {
          throw new InvalidURLError(`Hostname "${validatedUrl.hostname}" could not be resolved.`);
        }

        throw err;
      }

      // 4. Handle Redirects (301, 302, 303, 307, 308)
      const isRedirect =
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308;

      if (isRedirect) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new RedirectLimitError(
            `Exceeded maximum redirect limit of ${maxRedirects} hops.`
          );
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new HTTPError(
            `Redirect status ${response.status} returned without Location header.`,
            response.status
          );
        }

        try {
          const nextUrl = new URL(location, resolvedUrlString).href;
          currentUrl = nextUrl;
          continue;
        } catch {
          throw new HTTPError(
            `Invalid redirect location header received: "${location}"`,
            response.status
          );
        }
      }

      // 5. Validate HTTP Status
      if (!response.ok) {
        throw new HTTPError(
          `Remote server responded with HTTP status ${response.status} (${response.statusText}).`,
          response.status
        );
      }

      // 6. Enforce Content-Type
      const contentType = response.headers.get('content-type');
      if (!isValidHtmlContentType(contentType)) {
        throw new ContentTypeError(
          `Server returned unsupported Content-Type "${contentType || 'unknown'}". Only HTML documents are supported.`
        );
      }

      // 7. Check Content-Length header if present
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const parsedLength = parseInt(contentLength, 10);
        if (!isNaN(parsedLength) && parsedLength > maxBodySizeBytes) {
          throw new SizeLimitError(
            `Response Content-Length (${parsedLength} bytes) exceeds maximum limit of ${maxBodySizeBytes} bytes.`
          );
        }
      }

      // 8. Stream Body with byte counter (TIMER REMAINS ARMED UNTIL FULL READ IS COMPLETE)
      const body = response.body;
      if (!body) {
        return {
          html: '',
          finalUrl: resolvedUrlString,
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          redirectCount,
        };
      }

      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            receivedBytes += value.length;
            if (receivedBytes > maxBodySizeBytes) {
              await reader.cancel('Size limit exceeded');
              throw new SizeLimitError(
                `Response payload exceeded maximum allowed limit of ${maxBodySizeBytes} bytes.`
              );
            }
            chunks.push(value);
          }
        }
      } catch (streamErr) {
        if (streamErr instanceof SizeLimitError) {
          throw streamErr;
        }
        if (
          (streamErr instanceof Error && streamErr.name === 'AbortError') ||
          (streamErr as { name?: string })?.name === 'AbortError'
        ) {
          throw new TimeoutError(`Streaming response body timed out.`);
        }
        throw streamErr;
      }

      // Concatenate chunks and decode
      const totalBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const html = decoder.decode(totalBuffer);

      return {
        html,
        finalUrl: resolvedUrlString,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        redirectCount,
      };
    } finally {
      // NOTE: Timer is cleared here in the outer finally, covering both connection and body read
      clearTimeout(timer);
    }
  }
}
