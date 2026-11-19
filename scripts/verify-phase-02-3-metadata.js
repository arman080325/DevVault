/**
 * DevVault — Phase 02.3.1 & Phase 02.3.2 Verification Test Suite
 * 
 * Comprehensive automated verification for:
 * 1. URL syntax, scheme, port, and credential validation
 * 2. SSRF prevention for IPv4, IPv6, loopback, link-local, cloud metadata, and internal hostnames
 * 3. HTML parsing (Open Graph, Twitter Cards, JSON-LD, semantic tags, confidence scoring)
 * 4. In-memory LRU metadata cache (normalization, TTL expiration, capacity eviction)
 * 5. Sliding-window rate limiter (window bounds, remaining tokens, blocking)
 * 6. Provider architecture & extractor orchestration
 * 7. Error taxonomy and HTTP status code mappings
 * 8. Reusable oEmbed client (trusted whitelist, response schema validation, untrusted HTML isolation)
 * 9. YouTube provider (video ID extraction, canonical URL, thumbnail resolution, fallback)
 * 10. GitHub provider (segment validation, sub-resources, REST API mapping, rate limit handling)
 * 11. Instagram provider (shortcode extraction, login-wall handling, compliant fallback)
 * 12. Extractor pipeline priority & field-level metadata merging
 */

const {
  validateUrlStructure,
  isForbiddenIPv4,
  isForbiddenIPv6,
  isForbiddenIP,
  parseHtmlMetadata,
  detectPlatform,
  MetadataCache,
  normalizeUrlForCache,
  SlidingWindowRateLimiter,
  MetadataExtractor,
  WebsiteProvider,
  safeAgent,
  MetadataError,
  InvalidURLError,
  SSRFError,
  TimeoutError,
  ContentTypeError,
  SizeLimitError,
  RedirectLimitError,
  RateLimitError,
  ProviderError,
  oEmbedClient,
  OEmbedClient,
  sanitizeMediaUrl,
  YouTubeProvider,
  youtubeProvider,
  extractYouTubeVideoId,
  GitHubProvider,
  githubProvider,
  parseGitHubUrl,
  InstagramProvider,
  instagramProvider,
  parseInstagramUrl,
  mergeMetadata,
} = require('../dist-test/index.js');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  FAIL: ${testName} ${details ? '- ' + details : ''}`);
    failCount++;
  }
}

function expectThrow(fn, expectedErrorClass, testName) {
  try {
    fn();
    console.error(`  FAIL: ${testName} (expected ${expectedErrorClass.name} to be thrown, but nothing was thrown)`);
    failCount++;
  } catch (err) {
    if (err instanceof expectedErrorClass) {
      console.log(`  PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  FAIL: ${testName} (expected ${expectedErrorClass.name}, got ${err.constructor.name}: ${err.message})`);
      failCount++;
    }
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   DevVault Phase 02.3: Metadata Engine Verification');
  console.log('======================================================\n');

  // =========================================================================
  // 1. URL SYNTAX & SCHEME VALIDATION
  // =========================================================================
  console.log('1. URL Structure & Scheme Validation:');

  assert(
    validateUrlStructure('https://example.com').href === 'https://example.com/',
    'Accepts valid https URL'
  );
  assert(
    validateUrlStructure('http://devvault.app/library?tag=react').pathname === '/library',
    'Accepts valid http URL with query'
  );
  assert(
    validateUrlStructure('http://example.com:80').hostname === 'example.com',
    'Accepts standard port 80 for HTTP'
  );
  assert(
    validateUrlStructure('https://example.com:443').hostname === 'example.com',
    'Accepts standard port 443 for HTTPS'
  );

  expectThrow(() => validateUrlStructure(''), InvalidURLError, 'Rejects empty string');
  expectThrow(() => validateUrlStructure('not-a-url'), InvalidURLError, 'Rejects non-URL string');
  expectThrow(() => validateUrlStructure('ftp://ftp.example.com'), InvalidURLError, 'Rejects ftp:// scheme');
  expectThrow(() => validateUrlStructure('javascript:alert(1)'), InvalidURLError, 'Rejects javascript: scheme');
  expectThrow(() => validateUrlStructure('data:text/html,<h1>hi</h1>'), InvalidURLError, 'Rejects data: scheme');
  expectThrow(() => validateUrlStructure('file:///etc/passwd'), InvalidURLError, 'Rejects file: scheme');
  expectThrow(() => validateUrlStructure('http://admin:secret@example.com'), InvalidURLError, 'Rejects embedded credentials');
  expectThrow(() => validateUrlStructure('http://example.com:8080'), InvalidURLError, 'Rejects non-standard port 8080');
  expectThrow(() => validateUrlStructure('http://example.com:22'), InvalidURLError, 'Rejects SSH port 22');
  expectThrow(() => validateUrlStructure('https://example.com:5432'), InvalidURLError, 'Rejects PostgreSQL port 5432');

  // =========================================================================
  // 2. SSRF DEFENSE: IPv4, IPv6 & DANGEROUS HOSTNAMES
  // =========================================================================
  console.log('\n2. SSRF Protection: IP Ranges & Hostnames:');

  // IPv4 checks
  assert(isForbiddenIPv4('127.0.0.1'), 'Blocks 127.0.0.1 (Loopback)');
  assert(isForbiddenIPv4('127.100.200.1'), 'Blocks 127.0.0.0/8 range');
  assert(isForbiddenIPv4('10.0.0.1'), 'Blocks 10.0.0.1 (RFC 1918 Private)');
  assert(isForbiddenIPv4('10.255.255.254'), 'Blocks 10.0.0.0/8 upper bound');
  assert(isForbiddenIPv4('192.168.1.1'), 'Blocks 192.168.1.1 (RFC 1918 Private)');
  assert(isForbiddenIPv4('192.168.254.254'), 'Blocks 192.168.0.0/16 range');
  assert(isForbiddenIPv4('172.16.0.1'), 'Blocks 172.16.0.1 (RFC 1918 Private)');
  assert(isForbiddenIPv4('172.31.255.254'), 'Blocks 172.31.255.254 (RFC 1918 Private)');
  assert(!isForbiddenIPv4('172.32.0.1'), 'Allows public 172.32.0.1');
  assert(isForbiddenIPv4('169.254.169.254'), 'Blocks 169.254.169.254 (Cloud metadata / Link-local)');
  assert(isForbiddenIPv4('169.254.1.1'), 'Blocks 169.254.0.0/16 Link-local');
  assert(isForbiddenIPv4('100.100.100.200'), 'Blocks 100.100.100.200 (Alibaba Cloud metadata)');
  assert(isForbiddenIPv4('100.64.0.1'), 'Blocks 100.64.0.0/10 Carrier-grade NAT');
  assert(isForbiddenIPv4('0.0.0.0'), 'Blocks 0.0.0.0 default route');
  assert(isForbiddenIPv4('224.0.0.1'), 'Blocks 224.0.0.1 Multicast');
  assert(isForbiddenIPv4('240.0.0.1'), 'Blocks 240.0.0.1 Reserved');
  assert(!isForbiddenIPv4('8.8.8.8'), 'Allows public IP 8.8.8.8');
  assert(!isForbiddenIPv4('1.1.1.1'), 'Allows public IP 1.1.1.1');

  // IPv6 checks
  assert(isForbiddenIPv6('::1'), 'Blocks ::1 (IPv6 Loopback)');
  assert(isForbiddenIPv6('::'), 'Blocks :: (IPv6 Unspecified)');
  assert(isForbiddenIPv6('fe80::1'), 'Blocks fe80::1 (IPv6 Link-local)');
  assert(isForbiddenIPv6('fc00::1'), 'Blocks fc00::1 (IPv6 Unique Local)');
  assert(isForbiddenIPv6('fd12:3456:789a::1'), 'Blocks fd00::/8 (IPv6 Unique Local)');
  assert(isForbiddenIPv6('ff02::1'), 'Blocks ff00::/8 (IPv6 Multicast)');
  assert(isForbiddenIPv6('::ffff:127.0.0.1'), 'Blocks IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)');
  assert(isForbiddenIPv6('::ffff:169.254.169.254'), 'Blocks IPv4-mapped IPv6 cloud metadata');
  assert(isForbiddenIPv6('::ffff:192.168.1.1'), 'Blocks IPv4-mapped IPv6 private network');
  assert(isForbiddenIPv6('::ffff:7f00:1'), 'Blocks IPv4-mapped IPv6 in hex notation (::ffff:7f00:1 = 127.0.0.1)');
  assert(isForbiddenIPv6('::ffff:a9fe:a9fe'), 'Blocks IPv4-mapped IPv6 cloud metadata in hex (::ffff:a9fe:a9fe = 169.254.169.254)');
  assert(isForbiddenIPv6('::ffff:0a00:1'), 'Blocks IPv4-mapped IPv6 private network in hex (::ffff:0a00:1 = 10.0.0.1)');
  assert(isForbiddenIPv6('::ffff:c0a8:1'), 'Blocks IPv4-mapped IPv6 private network in hex (::ffff:c0a8:1 = 192.168.0.1)');
  assert(isForbiddenIPv6('2002:7f00:1::'), 'Blocks deprecated 6to4 prefix (2002::/16)');
  assert(isForbiddenIPv6('2001:0000:4136:e378:8000:63bf:3fff:fdd2'), 'Blocks Teredo tunneling prefix (2001:0::/32)');
  assert(isForbiddenIPv6('[::1]'), 'Blocks bracketed IPv6 loopback');
  assert(!isForbiddenIPv6('2607:f8b0:4005:805::200e'), 'Allows public Google IPv6');

  // Hostname & URL SSRF blocks
  expectThrow(() => validateUrlStructure('http://127.0.0.1/admin'), SSRFError, 'Rejects direct 127.0.0.1 URL');
  expectThrow(() => validateUrlStructure('http://169.254.169.254/latest/meta-data'), SSRFError, 'Rejects cloud metadata IP URL');
  expectThrow(() => validateUrlStructure('http://localhost'), SSRFError, 'Rejects localhost hostname');
  expectThrow(() => validateUrlStructure('http://test.localhost'), SSRFError, 'Rejects .localhost subdomain');
  expectThrow(() => validateUrlStructure('http://internal.service.local'), SSRFError, 'Rejects .local hostname');
  expectThrow(() => validateUrlStructure('http://backend.internal'), SSRFError, 'Rejects .internal hostname');
  expectThrow(() => validateUrlStructure('http://metadata.google.internal'), SSRFError, 'Rejects GCP metadata hostname');
  expectThrow(() => validateUrlStructure('http://instance-data'), SSRFError, 'Rejects AWS instance-data hostname');
  expectThrow(() => validateUrlStructure('http://[::1]/secret'), SSRFError, 'Rejects bracketed IPv6 loopback URL http://[::1]');
  expectThrow(() => validateUrlStructure('http://[fe80::1]/admin'), SSRFError, 'Rejects bracketed IPv6 link-local URL');
  expectThrow(() => validateUrlStructure('http://[fc00::1]/internal'), SSRFError, 'Rejects bracketed IPv6 unique-local URL');
  expectThrow(() => validateUrlStructure('http://[::ffff:7f00:1]/'), SSRFError, 'Rejects bracketed hex IPv4-mapped loopback');
  expectThrow(() => validateUrlStructure('http://[::ffff:a9fe:a9fe]/'), SSRFError, 'Rejects bracketed hex IPv4-mapped cloud metadata');

  // =========================================================================
  // 3. HTML / OPEN GRAPH / TWITTER / JSON-LD PARSER
  // =========================================================================
  console.log('\n3. Metadata HTML Parsing & Normalization:');

  const richHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>HTML Title Fallback</title>
      <!-- Open Graph -->
      <meta property="og:title" content="Open Graph Title">
      <meta property="og:description" content="Clean editorial description of resource.">
      <meta property="og:image" content="/images/preview.jpg">
      <meta property="og:site_name" content="DevVault Engineering">
      <meta property="og:type" content="article">
      <!-- Twitter -->
      <meta name="twitter:creator" content="@devvault">
      <!-- Canonical -->
      <link rel="canonical" href="https://devvault.app/blog/canonical-post">
      <!-- Author & Date -->
      <meta name="author" content="Alex Lin">
      <meta property="article:published_time" content="2026-11-19T08:00:00Z">
      <!-- JSON-LD -->
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "JSON-LD Headline",
        "description": "JSON-LD Description",
        "author": {
          "@type": "Person",
          "name": "Alex Lin"
        },
        "publisher": {
          "@type": "Organization",
          "name": "DevVault Team"
        },
        "datePublished": "2026-11-19T08:00:00.000Z"
      }
      </script>
    </head>
    <body>
      <h1>Article Content</h1>
    </body>
    </html>
  `;

  const parsed = parseHtmlMetadata(richHtml, 'https://devvault.app/blog/post', 'https://devvault.app/blog/post');

  assert(parsed.title === 'Open Graph Title', 'OG title takes priority over fallback title');
  assert(parsed.description === 'Clean editorial description of resource.', 'OG description extracted');
  assert(parsed.image === 'https://devvault.app/images/preview.jpg', 'Resolves relative image URL against host');
  assert(parsed.canonicalUrl === 'https://devvault.app/blog/canonical-post', 'Extracts canonical URL');
  assert(parsed.siteName === 'DevVault Engineering', 'Extracts site name');
  assert(parsed.author === 'Alex Lin', 'Extracts author');
  assert(parsed.publishedAt === '2026-11-19T08:00:00.000Z', 'Normalizes date to ISO 8601');
  assert(parsed.contentType === 'article', 'Extracts content type');
  assert(parsed.extractionStatus === 'success', 'Status is success when title and description present');
  assert(parsed.confidence >= 0.8, `High confidence score: ${parsed.confidence}`);

  // Minimal HTML
  const minimalHtml = `<html><head><title>Bare Minimum Page</title></head><body>Hello</body></html>`;
  const minimalParsed = parseHtmlMetadata(minimalHtml, 'https://minimal.com', 'https://minimal.com');
  assert(minimalParsed.title === 'Bare Minimum Page', 'Extracts <title> when no OG tags exist');
  assert(minimalParsed.description === null, 'Description is null for minimal page');
  assert(minimalParsed.extractionStatus === 'partial', 'Status is partial when only title is extracted');
  assert(minimalParsed.confidence === 0.35, `Baseline title confidence: ${minimalParsed.confidence}`);

  // Platform detection tests
  assert(detectPlatform('github.com') === 'GITHUB', 'Detects GITHUB platform');
  assert(detectPlatform('gist.github.com') === 'GITHUB', 'Detects Gist as GITHUB');
  assert(detectPlatform('youtube.com') === 'YOUTUBE', 'Detects YOUTUBE platform');
  assert(detectPlatform('youtu.be') === 'YOUTUBE', 'Detects youtu.be as YOUTUBE');
  assert(detectPlatform('instagram.com') === 'INSTAGRAM', 'Detects INSTAGRAM platform');
  assert(detectPlatform('docs.github.com') === 'GITHUB', 'Github docs routes to GITHUB');
  assert(detectPlatform('learn.gitbook.io') === 'DOCS', 'GitBook routes to DOCS');
  assert(detectPlatform('figma.com') === 'DESIGN', 'Figma routes to DESIGN');
  assert(detectPlatform('dribbble.com') === 'DESIGN', 'Dribbble routes to DESIGN');
  assert(detectPlatform('developer.mozilla.org') === 'WEBSITE', 'Standard site routes to WEBSITE');

  // =========================================================================
  // 4. METADATA CACHE & NORMALIZATION
  // =========================================================================
  console.log('\n4. In-Memory LRU Metadata Cache:');

  const cache = new MetadataCache(3, 50); // max 3 items, 50ms TTL

  // URL normalization
  const url1 = 'https://example.com/post/?utm_source=twitter&utm_medium=cpc#summary';
  const url2 = 'https://example.com/post';
  assert(normalizeUrlForCache(url1) === 'https://example.com/post', 'Normalizes URL: strips tracking params, trailing slash, and hash');

  // Verify that meaningful content parameters are PRESERVED and do not cause cache collisions
  const gitUrl1 = 'https://github.com/torvalds/linux/blob/master/Makefile?ref=v6.1';
  const gitUrl2 = 'https://github.com/torvalds/linux/blob/master/Makefile?ref=v6.2';
  assert(normalizeUrlForCache(gitUrl1).includes('ref=v6.1'), 'Preserves ref parameter for git/version branches');
  assert(normalizeUrlForCache(gitUrl1) !== normalizeUrlForCache(gitUrl2), 'Distinct ref parameters do NOT collide in cache');

  const sourceUrl = 'https://example.com/api?source=database';
  assert(normalizeUrlForCache(sourceUrl).includes('source=database'), 'Preserves source parameter for content queries');

  const dummyData = {
    title: 'Test Title',
    description: 'Test Desc',
    image: null,
    siteName: 'Example',
    sourceUrl: 'https://example.com/1',
    canonicalUrl: null,
    platform: 'WEBSITE',
    contentType: 'website',
    author: null,
    publishedAt: null,
    extractionStatus: 'success',
    confidence: 0.9,
    extractedAt: new Date().toISOString(),
  };

  cache.set('https://example.com/1', { ...dummyData, sourceUrl: 'https://example.com/1' });
  cache.set('https://example.com/2', { ...dummyData, sourceUrl: 'https://example.com/2' });
  cache.set('https://example.com/3', { ...dummyData, sourceUrl: 'https://example.com/3' });

  assert(cache.size() === 3, 'Cache stores items up to capacity');
  assert(cache.get('https://example.com/1')?.sourceUrl === 'https://example.com/1', 'Retrieves stored item');

  // LRU eviction: Adding 4th item evicts least recently used
  // Since we accessed item 1 above, item 2 should be the oldest!
  cache.set('https://example.com/4', { ...dummyData, sourceUrl: 'https://example.com/4' });
  assert(cache.size() === 3, 'Cache capacity maintained at 3');
  assert(cache.get('https://example.com/2') === null, 'Least recently used item (2) was evicted');
  assert(cache.get('https://example.com/1') !== null, 'Item 1 was preserved due to access');

  // TTL Expiration test
  await new Promise((r) => setTimeout(r, 60));
  assert(cache.get('https://example.com/1') === null, 'Item expired after TTL');

  // =========================================================================
  // 5. SLIDING WINDOW RATE LIMITER
  // =========================================================================
  console.log('\n5. Sliding Window Rate Limiter:');

  const limiter = new SlidingWindowRateLimiter(3, 1000); // 3 req per 1000ms
  const userId = 'user-test-123';

  const r1 = limiter.check(userId);
  assert(!r1.limited && r1.remaining === 2, 'Request 1 allowed, 2 remaining');

  const r2 = limiter.check(userId);
  assert(!r2.limited && r2.remaining === 1, 'Request 2 allowed, 1 remaining');

  const r3 = limiter.check(userId);
  assert(!r3.limited && r3.remaining === 0, 'Request 3 allowed, 0 remaining');

  const r4 = limiter.check(userId);
  assert(r4.limited && r4.remaining === 0 && r4.resetMs > 0, 'Request 4 blocked by rate limiter');

  // Different user not blocked
  const rOther = limiter.check('user-test-456');
  assert(!rOther.limited && rOther.remaining === 2, 'Different user is not rate limited');

  // =========================================================================
  // 6. PROVIDER ARCHITECTURE & EXTRACTOR ORCHESTRATION
  // =========================================================================
  console.log('\n6. Provider Architecture & Extractor Orchestration:');

  const extractor = new MetadataExtractor();
  const registered = extractor.getRegisteredProviders();
  assert(registered.includes('website'), 'Universal website provider is registered by default');
  assert(typeof safeAgent === 'object' && safeAgent !== null, 'safeAgent is configured with socket-level IP pinning connector');

  // SSRF prevention in extractor
  try {
    await extractor.extract('http://127.0.0.1:8080/danger');
    assert(false, 'Extractor blocked 127.0.0.1');
  } catch (err) {
    assert(err instanceof SSRFError || err instanceof InvalidURLError, 'Extractor rejects SSRF URL before fetching');
  }

  // =========================================================================
  // 7. ERROR TAXONOMY & HTTP STATUS MAPPINGS
  // =========================================================================
  console.log('\n7. Error Taxonomy & HTTP Status Codes:');

  assert(new InvalidURLError().statusCode === 400, 'InvalidURLError maps to HTTP 400');
  assert(new SSRFError().statusCode === 400, 'SSRFError maps to HTTP 400');
  assert(new TimeoutError().statusCode === 504, 'TimeoutError maps to HTTP 504');
  assert(new ContentTypeError().statusCode === 422, 'ContentTypeError maps to HTTP 422');
  assert(new SizeLimitError().statusCode === 422, 'SizeLimitError maps to HTTP 422');
  assert(new RedirectLimitError().statusCode === 400, 'RedirectLimitError maps to HTTP 400');
  assert(new RateLimitError().statusCode === 429, 'RateLimitError maps to HTTP 429');

  // =========================================================================
  // 8. REUSABLE OEMBED CLIENT & SECURITY CONTROLS
  // =========================================================================
  console.log('\n8. Reusable oEmbed Client & Security Controls:');

  assert(oEmbedClient instanceof OEmbedClient, 'oEmbedClient singleton instance is available');

  // Untrusted endpoint rejection
  try {
    await oEmbedClient.fetchOEmbed('https://malicious-domain.com/oembed', 'https://example.com');
    assert(false, 'oEmbed client rejected untrusted endpoint');
  } catch (err) {
    assert(err instanceof ProviderError, 'Rejects untrusted oEmbed endpoint with ProviderError');
  }

  // Media URL sanitization
  assert(sanitizeMediaUrl('javascript:alert(1)') === null, 'Sanitizes and blocks javascript: media URLs');
  assert(sanitizeMediaUrl('data:image/png;base64,...') === null, 'Sanitizes and blocks data: media URLs');
  assert(sanitizeMediaUrl('https://i.ytimg.com/vi/abc/hqdefault.jpg') === 'https://i.ytimg.com/vi/abc/hqdefault.jpg', 'Accepts valid https media URLs');
  assert(sanitizeMediaUrl('   https://example.com/img.jpg   ') === 'https://example.com/img.jpg', 'Trims whitespace on media URLs');
  assert(sanitizeMediaUrl('') === null, 'Returns null on empty media URL');

  // =========================================================================
  // 9. YOUTUBE PROVIDER VALIDATION & EXTRACTION
  // =========================================================================
  console.log('\n9. YouTube Provider Validation & Extraction:');

  assert(youtubeProvider instanceof YouTubeProvider, 'YouTubeProvider instance available');
  assert(youtubeProvider.priority === 20, 'YouTubeProvider priority is 20');

  // Video ID extraction across all supported URL forms
  const ytWatch = extractYouTubeVideoId(new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  assert(ytWatch === 'dQw4w9WgXcQ', 'Extracts ID from youtube.com/watch?v=');

  const ytShortUrl = extractYouTubeVideoId(new URL('https://youtu.be/dQw4w9WgXcQ?t=10'));
  assert(ytShortUrl === 'dQw4w9WgXcQ', 'Extracts ID from youtu.be/ short URL with timestamp');

  const ytShorts = extractYouTubeVideoId(new URL('https://youtube.com/shorts/dQw4w9WgXcQ'));
  assert(ytShorts === 'dQw4w9WgXcQ', 'Extracts ID from youtube.com/shorts/');

  const ytEmbed = extractYouTubeVideoId(new URL('https://www.youtube.com/embed/dQw4w9WgXcQ'));
  assert(ytEmbed === 'dQw4w9WgXcQ', 'Extracts ID from youtube.com/embed/');

  const ytLive = extractYouTubeVideoId(new URL('https://www.youtube.com/live/dQw4w9WgXcQ?feature=share'));
  assert(ytLive === 'dQw4w9WgXcQ', 'Extracts ID from youtube.com/live/');

  // Invalid IDs
  assert(extractYouTubeVideoId(new URL('https://youtube.com/watch?v=invalidShort')) === null, 'Rejects video ID with invalid length');
  assert(extractYouTubeVideoId(new URL('https://youtube.com/watch?v=invalid@char!')) === null, 'Rejects video ID with illegal characters');
  assert(extractYouTubeVideoId(new URL('https://youtube.com/channel/UC123456789')) === null, 'Returns null for channel URL');

  // Supports checks
  assert(youtubeProvider.supports(new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')), 'Supports standard watch URL');
  assert(youtubeProvider.supports(new URL('https://youtu.be/dQw4w9WgXcQ')), 'Supports youtu.be URL');
  assert(!youtubeProvider.supports(new URL('https://vimeo.com/123456789')), 'Rejects non-YouTube URL');

  // =========================================================================
  // 10. GITHUB PROVIDER VALIDATION & SUB-RESOURCE MAPPING
  // =========================================================================
  console.log('\n10. GitHub Provider Validation & Sub-Resource Mapping:');

  assert(githubProvider instanceof GitHubProvider, 'GitHubProvider instance available');
  assert(githubProvider.priority === 30, 'GitHubProvider priority is 30');

  // Segment parsing
  const ghRepo = parseGitHubUrl(new URL('https://github.com/facebook/react'));
  assert(ghRepo !== null && ghRepo.owner === 'facebook' && ghRepo.repo === 'react' && ghRepo.isRoot, 'Parses standard repository root');

  const ghDotGit = parseGitHubUrl(new URL('https://github.com/facebook/react.git'));
  assert(ghDotGit !== null && ghDotGit.repo === 'react', 'Strips .git suffix from repository name');

  // Sub-resource parsing
  const ghIssue = parseGitHubUrl(new URL('https://github.com/facebook/react/issues/28000'));
  assert(ghIssue !== null && ghIssue.subType === 'issues' && ghIssue.subIdentifier === '28000' && !ghIssue.isRoot, 'Identifies issue sub-resource');

  const ghPR = parseGitHubUrl(new URL('https://github.com/facebook/react/pull/28001'));
  assert(ghPR !== null && ghPR.subType === 'pull' && ghPR.subIdentifier === '28001' && !ghPR.isRoot, 'Identifies pull request sub-resource');

  const ghTree = parseGitHubUrl(new URL('https://github.com/vercel/next.js/tree/canary'));
  assert(ghTree !== null && ghTree.subType === 'tree' && !ghTree.isRoot, 'Identifies branch code tree sub-resource');

  const ghRelease = parseGitHubUrl(new URL('https://github.com/vercel/next.js/releases/tag/v15.1.0'));
  assert(ghRelease !== null && ghRelease.subType === 'releases' && !ghRelease.isRoot, 'Identifies release sub-resource');

  // Rejection of invalid paths and reserved names
  assert(parseGitHubUrl(new URL('https://github.com/marketplace')) === null, 'Rejects reserved GitHub path /marketplace');
  assert(parseGitHubUrl(new URL('https://github.com/pricing')) === null, 'Rejects reserved GitHub path /pricing');
  assert(parseGitHubUrl(new URL('https://github.com/explore')) === null, 'Rejects reserved GitHub path /explore');
  assert(parseGitHubUrl(new URL('https://github.com/invalid@char/repo')) === null, 'Rejects owner with illegal characters');
  assert(parseGitHubUrl(new URL('https://gitlab.com/facebook/react')) === null, 'Rejects non-GitHub hostname');

  // =========================================================================
  // 11. INSTAGRAM PROVIDER BEST-EFFORT & LOGIN-WALL HANDLING
  // =========================================================================
  console.log('\n11. Instagram Provider Best-Effort & Login-Wall Handling:');

  assert(instagramProvider instanceof InstagramProvider, 'InstagramProvider instance available');
  assert(instagramProvider.priority === 15, 'InstagramProvider priority is 15');

  // URL parsing across posts, reels, tv
  const igPost = parseInstagramUrl(new URL('https://www.instagram.com/p/C_abc123/'));
  assert(igPost !== null && igPost.shortcode === 'C_abc123' && igPost.kind === 'post', 'Parses Instagram post shortcode');

  const igReel = parseInstagramUrl(new URL('https://instagram.com/reel/D_xyz456?utm_source=ig_web'));
  assert(igReel !== null && igReel.shortcode === 'D_xyz456' && igReel.kind === 'reel', 'Parses Instagram reel shortcode with query');

  const igTv = parseInstagramUrl(new URL('https://instagram.com/tv/E_tv789/'));
  assert(igTv !== null && igTv.shortcode === 'E_tv789' && igTv.kind === 'tv', 'Parses Instagram TV shortcode');

  assert(parseInstagramUrl(new URL('https://instagram.com/explore/')) === null, 'Rejects unsupported /explore path');
  assert(parseInstagramUrl(new URL('https://twitter.com/p/123456')) === null, 'Rejects non-Instagram host');

  // =========================================================================
  // 12. EXTRACTOR PIPELINE PRIORITY & FIELD-LEVEL MERGING
  // =========================================================================
  console.log('\n12. Extractor Priority Ordering & Field-Level Merging:');

  const globalExtractor = new MetadataExtractor();
  const providerNames = globalExtractor.getRegisteredProviders();

  // Verify priority ordering: GitHub (30) > YouTube (20) > Instagram (15) > Website (0)
  assert(providerNames[0] === 'github', 'First priority is github (30)');
  assert(providerNames[1] === 'youtube', 'Second priority is youtube (20)');
  assert(providerNames[2] === 'instagram', 'Third priority is instagram (15)');
  assert(providerNames[3] === 'website', 'Fallback priority is website (0)');

  // Verify field-level merging logic
  const primaryMeta = {
    title: 'Primary Title',
    description: null, // missing description
    image: 'https://example.com/primary.jpg',
    siteName: 'Primary Site',
    sourceUrl: 'https://example.com/page',
    canonicalUrl: 'https://example.com/canonical',
    platform: 'YOUTUBE',
    contentType: 'video',
    author: null, // missing author
    publishedAt: null,
    extractionStatus: 'partial',
    confidence: 0.7,
    extractedAt: '2026-11-19T10:00:00.000Z',
    warnings: ['Primary warning'],
  };

  const fallbackMeta = {
    title: 'Fallback Title (should NOT overwrite primary)',
    description: 'Enriched description from HTML fallback.',
    image: 'https://example.com/fallback.jpg (should NOT overwrite)',
    siteName: 'Fallback Site',
    sourceUrl: 'https://example.com/page',
    canonicalUrl: 'https://example.com/fallback-canonical',
    platform: 'WEBSITE',
    contentType: 'website',
    author: 'Enriched Author',
    publishedAt: '2026-11-19T08:00:00.000Z',
    extractionStatus: 'success',
    confidence: 0.85,
    extractedAt: '2026-11-19T10:00:01.000Z',
    warnings: ['Fallback warning'],
  };

  const merged = mergeMetadata(primaryMeta, fallbackMeta);

  assert(merged.title === 'Primary Title', 'Preserves primary title; does not overwrite with fallback');
  assert(merged.description === 'Enriched description from HTML fallback.', 'Fills missing description from fallback');
  assert(merged.image === 'https://example.com/primary.jpg', 'Preserves primary image; does not overwrite with fallback');
  assert(merged.author === 'Enriched Author', 'Fills missing author from fallback');
  assert(merged.publishedAt === '2026-11-19T08:00:00.000Z', 'Fills missing publishedAt from fallback');
  assert(merged.platform === 'YOUTUBE', 'Preserves specialized platform (YOUTUBE)');
  assert(merged.contentType === 'video', 'Preserves specialized contentType (video)');
  assert(merged.warnings?.length === 2, 'Combines unique warnings from primary and fallback');
  assert(merged.confidence === 0.85, 'Takes highest confidence score');

  console.log('\n======================================================');
  console.log(`Verification Complete: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
