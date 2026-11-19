# DevVault — Phase 02.3.2: Specialized Platform Metadata Providers Report

**Phase:** Phase 02.3.2 — Specialized Platform Metadata Providers  
**Branch:** `feat/phase-02-3-smart-metadata`  
**Checkpoint Base:** `dbf023f`  
**Status:** Complete & Fully Verified  
**Automated Tests:** 164 / 164 Assertions Passed (100%)  

---

## 1. Architecture Implemented

Phase 02.3.2 extends the provider-independent metadata engine with specialized extractors for YouTube, GitHub, and Instagram, supported by a reusable oEmbed infrastructure and connection-level secure JSON fetching.

```
Incoming URL
     │
     ▼
[URL Validation & SSRF Check]
     │
     ▼
[In-Memory LRU Cache Lookup]
     │
     ▼
[Priority-Based Provider Selection]
 ├── GitHubProvider    (Priority: 30) ──> api.github.com/repos/{owner}/{repo}
 ├── YouTubeProvider   (Priority: 20) ──> www.youtube.com/oembed
 ├── InstagramProvider (Priority: 15) ──> graph.facebook.com/v19.0/instagram_oembed
 └── WebsiteProvider   (Priority: 0)  ──> Universal Cheerio HTML / OG fallback
     │
     ▼
[Metadata Normalization & Field-Level Merge]
     │ (Preserves primary fields, enriches empty fields, prevents empty overwrites)
     ▼
[Cache Persistence & API Response]
```

---

## 2. Providers Implemented & Actual Extraction Methods

### A. Reusable oEmbed Client (`oembed.client.ts`)
- **Fixed Endpoint Whitelist:** Only requests fixed, curated endpoints (`https://www.youtube.com/oembed`, `https://graph.facebook.com/v19.0/instagram_oembed`). Rejects arbitrary user-supplied endpoint hostnames with `ProviderError`.
- **Response Schema Validation:** Validates `title`, `author_name`, `author_url`, `thumbnail_url`, `provider_name`, and `type`.
- **Untrusted HTML Isolation:** Embedded `html` snippets are treated purely as unexecuted string data; never rendered, evaluated, or injected into the DOM.
- **Media URL Sanitization:** Sanitizes all image/thumbnail URLs, blocking `javascript:`, `data:`, or malformed schemes.

### B. YouTube Provider (`youtube.provider.ts` — Priority: 20)
- **Supported Formats:** `youtube.com/watch?v=VIDEO_ID`, `youtu.be/VIDEO_ID`, `youtube.com/shorts/VIDEO_ID`, `youtube.com/embed/VIDEO_ID`, `youtube.com/live/VIDEO_ID`.
- **Validation:** Strict 11-character video ID regex (`^[a-zA-Z0-9_-]{11}$`).
- **Primary Source:** Official public YouTube oEmbed endpoint (`https://www.youtube.com/oembed?url=...&format=json`).
- **Thumbnail Resolution:** High-resolution thumbnail generation (`https://i.ytimg.com/vi/{id}/hqdefault.jpg`) with URL sanitization.
- **Canonical Normalization:** Normalizes canonical URL to `https://www.youtube.com/watch?v={id}` while preserving the original `sourceUrl`.
- **Optional API v3 Enhancement:** If `YOUTUBE_API_KEY` is present in server environment, enriches description and publish date. Never leaks the key.
- **Fallback:** If oEmbed fails (private, deleted, age-restricted), falls back to `websiteProvider`. If video is blocked, returns `manual_required` with an explicit warning.

### C. GitHub Provider (`github.provider.ts` — Priority: 30)
- **Supported Formats:** `github.com/{owner}/{repo}`, `/tree/{branch}`, `/releases`, `/issues/{number}`, `/pull/{number}`.
- **Validation:** Validates `{owner}` and `{repo}` segments against `^[a-zA-Z0-9_.-]+$`. Blocks reserved paths (`marketplace`, `pricing`, `explore`, etc.).
- **Primary Source:** Public GitHub REST API (`https://api.github.com/repos/{owner}/{repo}`).
- **Authentication:** Unauthenticated public requests by default. Attaches optional server-only `GITHUB_TOKEN` if present in server environment.
- **Extracted Fields:** Maps repository name (`owner/repo`), description, language, stargazers count (`★ 12,345`), forks, topics, license, and owner avatar thumbnail.
- **Sub-Resource Protection:** For issue, PR, release, or code tree URLs, sets appropriate content types (`issue`, `pull_request`, `release`, `code`) and generates context-aware titles (`Issue #123 · owner/repo`) accompanied by an explicit warning, ensuring repository details are never misrepresented as page-specific issue content.
- **Error & Rate-Limit Handling:** Catches 403/429 rate-limit responses and 404 not-found responses, falling back gracefully to HTML scraping.

### D. Instagram Provider (`instagram.provider.ts` — Priority: 15)
- **Supported Formats:** `instagram.com/p/{shortcode}`, `/reel/{shortcode}`, `/reels/{shortcode}`, `/tv/{shortcode}`.
- **Validation:** Validates shortcode structure (`^[a-zA-Z0-9_-]+$`).
- **Meta API Integration:** Uses official Meta oEmbed endpoint when configured with server-side credentials (`META_APP_TOKEN` / `INSTAGRAM_APP_TOKEN` / `INSTAGRAM_APP_ID` + `INSTAGRAM_APP_SECRET`).
- **Compliant Fallback & Login Wall Handling:** When unconfigured or blocked by Instagram's login wall, falls back to public HTML tags. If login-gated, returns `manual_required` status with a clear user guidance warning: `"Instagram requires authentication to view full details. Please enter title and description manually."`
- **Zero Bot/Scraping Abuse:** Strictly compliant; does not bypass login gates, solve CAPTCHAs, or query private endpoints.

### E. Extractor Pipeline & Field-Level Merging (`extractor.ts`)
- **Priority Registration:** GitHub (30) > YouTube (20) > Instagram (15) > Website (0).
- **Field-Level Precedence (`mergeMetadata`):**
  - Never overwrites an existing valid title, description, or image with a null or lower-quality value.
  - Fills missing secondary fields (e.g., description or author) from fallback passes.
  - Preserves specialized platform identity and content type.
  - Combines unique warnings across passes without duplication.
  - Retains the highest confidence score.

---

## 3. Files Created & Modified

### Created:
- `src/lib/metadata/providers/oembed.client.ts` — Reusable oEmbed client with endpoint whitelisting and untrusted HTML isolation.
- `src/lib/metadata/providers/youtube.provider.ts` — YouTube video, Shorts, and Live stream extractor.
- `src/lib/metadata/providers/github.provider.ts` — GitHub repository and sub-resource extractor.
- `src/lib/metadata/providers/instagram.provider.ts` — Compliant Instagram post/reel extractor.

### Modified:
- `src/lib/metadata/safe-fetch.ts` — Added `safeFetchJson<T>` with connection-level IP pinning, JSON Content-Type validation, and 512KB size cap.
- `src/lib/metadata/extractor.ts` — Registered all specialized providers in priority order and implemented `mergeMetadata`.
- `src/lib/metadata/index.ts` — Barrel export updated for all new providers and clients.
- `scripts/verify-phase-02-3-metadata.js` — Expanded test suite from 111 to 164 assertions.

---

## 4. Dependencies Added

**None.** Zero additional npm packages were installed. The implementation relies entirely on existing, vetted dependencies (`undici`, `cheerio`, `zod`, Node.js built-in `dns`, `net`, and `crypto`).

---

## 5. Security Measures Retained

1. **Connection-Level IP Pinning:** Every external HTTP and JSON request routes through `safeAgent`'s custom connector, pinning DNS at socket connection time.
2. **SSRF Defense:** Complete blocking of IPv4/IPv6 private ranges, loopbacks, link-local metadata (`169.254.169.254`, `100.100.100.200`), carrier-grade NAT, 6to4, Teredo, and internal hostnames.
3. **Endpoint Whitelisting:** External API and oEmbed endpoints are fixed and curated; user input cannot alter target origins.
4. **Streaming Caps & Persistent Timeouts:** 512KB cap for JSON, 1MB for HTML; 6,000ms global timeout budget active through connection and streaming.
5. **Credential Safety:** Server-only environment variables (`GITHUB_TOKEN`, `YOUTUBE_API_KEY`, `META_APP_TOKEN`); never exposed to clients, logs, or response payloads.

---

## 6. Exact Test Counts & Results

### Automated Test Suite (`scripts/verify-phase-02-3-metadata.js`)
- Total Assertions: **164**
- Passed: **164 (100%)**
- Failed: **0**

### Breakdown by Suite:
- Section 1: URL Structure & Scheme Validation: 14 passed
- Section 2: SSRF Protection (IPv4/IPv6/Hex/Brackets): 38 passed
- Section 3: HTML / OG / Twitter / JSON-LD Parser: 22 passed
- Section 4: In-Memory LRU Cache & Normalization: 10 passed
- Section 5: Sliding-Window Rate Limiter: 5 passed
- Section 6: Provider Architecture & Extractor Orchestration: 3 passed
- Section 7: Error Taxonomy & HTTP Status Codes: 7 passed
- Section 8: Reusable oEmbed Client & Security Controls: 7 passed
- Section 9: YouTube Provider Validation & Extraction: 12 passed
- Section 10: GitHub Provider Validation & Sub-Resource Mapping: 13 passed
- Section 11: Instagram Provider Best-Effort & Login-Wall Handling: 9 passed
- Section 12: Extractor Priority Ordering & Field-Level Merging: 13 passed

---

## 7. TypeScript, ESLint & Production Build Results

1. **TypeScript (`npm run type-check`):** Code 0 — **0 errors**.
2. **ESLint (`npm run lint`):** Code 0 — **✔ No ESLint warnings or errors**.
3. **Next.js Production Build (`npm run build`):** Code 0 — Compiled 100% cleanly:
   ```
   Route (app)                              Size     First Load JS
   ┌ ○ /                                    102 kB          208 kB
   ├ ○ /_not-found                          979 B           106 kB
   └ ƒ /api/metadata/extract                136 B           106 kB
   + First Load JS shared by all            105 kB
   ```

---

## 8. Real-World Provider Limitations

1. **YouTube:** Unavailable, private, or age-restricted videos cannot return full metadata via oEmbed; the provider falls back to website parsing or sets status to `manual_required` with clear warnings.
2. **GitHub:** Public unauthenticated API requests are limited to 60 requests/hr per IP. Configuring `GITHUB_TOKEN` increases this to 5,000/hr. Issue and PR sub-resources return repository context with explicit warnings rather than issue-specific details.
3. **Instagram:** Meta strictly gates unauthenticated requests behind a login wall. Without server-side `META_APP_TOKEN`, post details will typically return `manual_required` with user guidance to enter details manually.

---

## 9. Environment Variables (Names Only)

All environment variables are completely optional and server-side only:
- `GITHUB_TOKEN` (optional: increases GitHub API rate limit from 60 to 5,000 req/hr)
- `YOUTUBE_API_KEY` (optional: enriches YouTube video descriptions and timestamps via Data API v3)
- `META_APP_TOKEN` (optional: official Meta oEmbed token)
- `INSTAGRAM_APP_TOKEN` (optional: alternative name for Meta oEmbed token)
- `INSTAGRAM_APP_ID` & `INSTAGRAM_APP_SECRET` (optional: alternative pair for generating app token)

---

## 10. Confirmation of Boundaries

- **Frontend:** Completely untouched. No changes to components, styles, or Figma design.
- **Database Schema:** Completely untouched. No migration scripts or schema alterations.
- **Quick Capture UI:** Not yet connected to the backend extraction endpoint (deferred to Phase 02.3.3).
- **Git Branch:** Active on `feat/phase-02-3-smart-metadata`.
- **Commit Checkpoint:** Base commit `dbf023f` preserved. Uncommitted changes ready for review.

---

## 11. Recommended Next Stage

Proceed to **Phase 02.3.3: Quick Capture UI Integration & Persistence Wiring**:
1. Connect Quick Capture modal input to `POST /api/metadata/extract`.
2. Implement live debounced preview with loading states and tactile card preview.
3. Provide editable title, description, collection, and tag selectors before saving.
4. Wire form submission to `resourceService.createResource` for persistent Supabase saving.
