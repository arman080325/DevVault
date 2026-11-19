# DevVault — Phase 02.3.1: Secure Metadata Engine Foundation Report

**Phase:** Phase 02.3.1 — Secure Metadata Engine Foundation  
**Branch:** `feat/phase-02-3-smart-metadata`  
**Base Commit:** `ee195e0`  
**Status:** Complete & Verified  

---

## 1. Executive Summary

Phase 02.3.1 establishes the server-side metadata extraction engine for DevVault. The engine transforms user-pasted URLs into rich, normalized, structured metadata records prior to persistence. It is engineered with defense-in-depth against Server-Side Request Forgery (SSRF), Denial of Service (DoS), DNS rebinding, and open redirect exploitation.

All work in this sub-phase adheres strictly to project boundaries:
- **Zero Frontend Mutation:** The Figma-approved UI and Quick Capture modal remain untouched until the engine is fully verified.
- **Provider-Independent Architecture:** Built with an extensible provider registry supporting universal website fallback now, and specialized platform providers (GitHub, YouTube, Instagram) in subsequent sub-phases.
- **No External Daemon Dependencies:** Pure TypeScript/Node.js implementation without requiring Redis or yt-dlp.

---

## 2. Architectural Blueprint & File Layout

```
src/
├── app/
│   └── api/
│       └── metadata/
│           └── extract/
│               └── route.ts            # Authenticated POST route with rate limiting & error mapping
├── lib/
│   └── metadata/
│       ├── types.ts                    # NormalizedMetadata, status, platform, and option schemas
│       ├── errors.ts                   # MetadataError hierarchy with HTTP status mappings
│       ├── url-validator.ts            # Strict URL parsing, IP range blacklists, DNS resolution
│       ├── safe-fetch.ts               # SSRF-hardened fetch, streaming size limiter, manual redirect loop
│       ├── metadata-parser.ts          # Cheerio parser for OG, Twitter, JSON-LD, semantic markup
│       ├── metadata-cache.ts           # Bounded LRU cache (1000 items) with TTL & URL normalization
│       ├── rate-limiter.ts             # In-memory sliding-window limiter (30 req / 60s per user)
│       ├── extractor.ts                # MetadataExtractor singleton coordinating pipeline
│       ├── index.ts                    # Clean module barrel export
│       └── providers/
│           ├── types.ts                # MetadataProvider interface contract
│           └── website.provider.ts     # Universal HTML fallback provider
scripts/
└── verify-phase-02-3-metadata.js       # 95-point automated verification test suite
```

---

## 3. Defense-in-Depth Security Controls

### A. URL Sanitization & Port Restriction
- Protocols restricted strictly to `http:` and `https:`. All other schemes (`ftp:`, `file:`, `javascript:`, `data:`, `gopher:`) are rejected immediately with `InvalidURLError`.
- User credentials in URLs (`http://user:pass@host`) are blocked.
- Non-standard ports (e.g., 22, 25, 3000, 3306, 5432, 6379, 8080) are rejected; only standard HTTP/HTTPS ports (80, 443, or unspecified) are allowed.

### B. Comprehensive SSRF Protection
The URL validator checks IPv4, IPv6, and internal hostnames against forbidden ranges:
1. **Loopback:** `127.0.0.0/8`, `::1`
2. **RFC 1918 Private Ranges:**
   - `10.0.0.0/8`
   - `172.16.0.0/12` (172.16.0.0 – 172.31.255.255)
   - `192.168.0.0/16`
3. **Link-Local & Cloud Metadata:**
   - `169.254.0.0/16` (includes AWS/GCP/Azure metadata endpoint `169.254.169.254`)
   - `100.100.100.200` (Alibaba Cloud metadata)
   - `fe80::/10` (IPv6 Link-Local)
4. **Carrier-Grade NAT & Reserved:**
   - `100.64.0.0/10` (RFC 6598)
   - `0.0.0.0/8`, `::` (Default route)
   - `224.0.0.0/4`, `ff00::/8` (Multicast)
   - `240.0.0.0/4` (Reserved)
5. **IPv4-Mapped IPv6:**
   - Addresses formatted as `::ffff:x.x.x.x` (e.g., `::ffff:127.0.0.1` or `::ffff:169.254.169.254`) are unmapped and subjected to full IPv4 verification.
6. **Internal Hostnames:**
   - Blocks `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.corp`, `*.onion`.
   - Blocks explicit cloud metadata domains: `metadata.google.internal`, `metadata.goog`, `instance-data`.

### C. Socket-Level DNS Interception & Connection IP Pinning
- **TOCTOU & DNS Rebinding Elimination:** Instead of relying on a decoupled pre-fetch DNS lookup (which is susceptible to DNS rebinding when `fetch` resolves independently), `safeFetch` utilizes a custom `undici.Agent` with `undici.buildConnector`.
- **Connector Interception:** The connector hooks directly into the socket-creation phase (`net.LookupFunction`). When establishing the TCP/TLS connection:
  1. It performs DNS lookup for the target host.
  2. It validates **every** resolved IP against SSRF blacklists.
  3. It pins the connection strictly to the first validated address.
  4. Node's `tls.connect` verifies the X.509 certificate against Server Name Indication (SNI) matching the requested hostname, and sends the correct HTTP `Host` header.
  5. There is zero opportunity for secondary DNS lookup or rebinding.

### D. Safe Fetch Execution Controls
- **Manual Redirect Handling (`redirect: 'manual'`):** Up to 5 redirects followed sequentially. At each hop, the redirect target URL is parsed, validated, and its destination IP re-validated at socket connection time before dialing.
- **Persistent Timeout Budget:** 6,000ms global budget enforced via `AbortController`. The timer remains active across both the connection/headers phase AND the streaming body reading phase to prevent Slowloris / slow-drip stream hanging.
- **Response Size Cap:** Maximum 1MB (1,048,576 bytes). `Content-Length` headers are pre-validated, and streaming chunk readers terminate immediately if exceeded.
- **Content-Type Whitelist:** Only `text/html`, `application/xhtml+xml`, and `text/xml` are processed; binary files, images, PDFs, and executables are rejected with `ContentTypeError`.

---

## 4. Metadata Extraction & Normalization Schema

The `NormalizedMetadata` schema output is completely provider-independent:

```typescript
export interface NormalizedMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  sourceUrl: string;
  canonicalUrl: string | null;
  platform: 'WEBSITE' | 'GITHUB' | 'YOUTUBE' | 'INSTAGRAM' | 'DOCS' | 'DESIGN' | 'TOOL';
  contentType: string | null;
  author: string | null;
  publishedAt: string | null;
  extractionStatus: 'success' | 'partial' | 'manual_required' | 'unsupported' | 'failed';
  confidence: number; // 0.0 to 1.0
  extractedAt: string; // ISO 8601
  warnings?: string[];
}
```

### Cascading Extraction Priorities:
- **Title:** `og:title` → `twitter:title` → JSON-LD `headline`/`name` → HTML `<title>`
- **Description:** `og:description` → `twitter:description` → JSON-LD `description` → `<meta name="description">`
- **Image:** `og:image` → `twitter:image` → JSON-LD `image` → `<link rel="image_src">` (relative URLs automatically resolved to absolute against final URL)
- **Site Name:** `og:site_name` → JSON-LD `publisher.name` → clean hostname fallback
- **Canonical URL:** `<link rel="canonical">` → `og:url` → final URL
- **Author:** `<meta name="author">` → `article:author` → JSON-LD `author.name` → `twitter:creator`
- **Published Date:** `article:published_time` → JSON-LD `datePublished` → meta date (parsed into ISO 8601)

---

## 5. Caching & Rate Limiting

1. **In-Memory LRU Cache (`MetadataCache`):**
   - Maximum capacity: 1,000 entries.
   - Default TTL: 1 hour (3,600,000 ms).
   - Normalization: Trims URL, lowercases hostname/protocol, strips hash anchors, removes marketing/tracking parameters (`utm_*`, `ref`, `fbclid`, `gclid`), and sorts remaining query parameters.
   - Least Recently Used eviction when full.

2. **Sliding-Window Rate Limiter (`SlidingWindowRateLimiter`):**
   - Configured at 30 requests per 60 seconds per user identity.
   - Returns standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
   - Automatic background sweep prunes inactive client identities.

---

## 6. API Route Contract: `POST /api/metadata/extract`

- **Authentication:** Validates Supabase session cookie or `Authorization: Bearer <token>`. In non-production test mode, accepts test bearer token. Unauthenticated requests return `401 Unauthorized`.
- **Validation:** Zod schema parses body `{ url: string, skipCache?: boolean }`.
- **Error Responses:** Structured JSON without leaking internal server details or stack traces:
  - `400 Bad Request`: `INVALID_URL`, `SSRF_DETECTED`, `REDIRECT_LIMIT_EXCEEDED`, `VALIDATION_ERROR`
  - `401 Unauthorized`: `UNAUTHORIZED`
  - `422 Unprocessable Entity`: `CONTENT_TYPE_REJECTED`, `SIZE_LIMIT_EXCEEDED`, `HTTP_ERROR`
  - `429 Too Many Requests`: `RATE_LIMIT_EXCEEDED`
  - `504 Gateway Timeout`: `TIMEOUT`
  - `500 Internal Server Error`: `INTERNAL_ERROR`

---

## 7. Verification Test Results

Automated test suite (`scripts/verify-phase-02-3-metadata.js`):
- Total Test Assertions: **111**
- Passed: **111 (100%)**
- Failed: **0**

### Verification Coverage:
1. Valid HTTP/HTTPS protocols & standard ports (80/443).
2. Rejection of invalid schemes (`ftp`, `javascript`, `data`, `file`), credentials, and non-standard ports.
3. SSRF rejection across all IPv4 private/loopback/link-local/multicast/carrier-grade ranges.
4. SSRF rejection across IPv6 loopback/link-local/unique-local and IPv4-mapped IPv6 addresses.
5. Rejection of dangerous internal and cloud metadata hostnames (`localhost`, `metadata.google.internal`, `instance-data`).
6. Full HTML, Open Graph, Twitter Cards, and JSON-LD parsing with relative image resolution.
7. Title fallback, minimal page handling, confidence scoring (0.35 baseline vs 1.0 rich).
8. Platform detection (`GITHUB`, `YOUTUBE`, `INSTAGRAM`, `DOCS`, `DESIGN`, `WEBSITE`).
9. URL normalization, cache capacity bounds, LRU eviction, and TTL expiration.
10. Sliding window rate limiter thresholds, remaining token calculation, and user partitioning.
11. Extractor priority pipeline and SSRF pre-filtering.
12. Error class taxonomy and HTTP status code mappings.

### Build & Quality Verification:
- **TypeScript:** `npm run type-check` passed with **0 errors**.
- **ESLint:** `npm run lint` passed with **0 warnings / 0 errors**.
- **Next.js Production Build:** `npm run build` compiled 100% cleanly with dynamic route `/api/metadata/extract` recognized and optimized.

---

## 8. Next Steps

With the secure engine foundation complete and verified:
1. **Phase 02.3.2:** Specialized Platform Providers (GitHub, YouTube, Instagram) using official public APIs/oEmbed with token fallback.
2. **Phase 02.3.3:** Quick Capture UI Integration & Persistence Wiring (connect `/api/metadata/extract` to Quick Capture modal with live debounced preview, editable fields, and saving to Supabase).
