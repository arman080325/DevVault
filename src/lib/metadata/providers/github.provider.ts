/**
 * DevVault — GitHub Metadata Provider
 * 
 * Extracts repository metadata via GitHub REST API with rate limit handling,
 * sub-resource protection (issues, PRs, releases), and website HTML fallback.
 */

import { HTTPError } from '../errors';
import { safeFetchJson } from '../safe-fetch';
import { MetadataExtractionOptions, NormalizedMetadata } from '../types';
import { sanitizeMediaUrl } from './oembed.client';
import { MetadataProvider } from './types';
import { websiteProvider } from './website.provider';

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics?: string[];
  license?: {
    name: string;
    spdx_id?: string;
  } | null;
  created_at: string;
  updated_at: string;
  default_branch: string;
}

const RESERVED_GITHUB_NAMES = new Set([
  'features',
  'marketplace',
  'pricing',
  'settings',
  'explore',
  'trending',
  'about',
  'contact',
  'security',
  'login',
  'join',
  'pulls',
  'issues',
  'notifications',
  'organizations',
  'orgs',
  'users',
]);

const SEGMENT_REGEX = /^[a-zA-Z0-9_.-]+$/;

/**
 * Parses GitHub repository segments and sub-resource identifiers.
 */
export function parseGitHubUrl(url: URL): {
  owner: string;
  repo: string;
  subType: string | null;
  subIdentifier: string | null;
  isRoot: boolean;
} | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'github.com') {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [owner, rawRepo] = segments;
  // Strip trailing .git if present
  const repo = rawRepo.endsWith('.git') ? rawRepo.slice(0, -4) : rawRepo;

  if (RESERVED_GITHUB_NAMES.has(owner.toLowerCase())) {
    return null;
  }

  if (!SEGMENT_REGEX.test(owner) || !SEGMENT_REGEX.test(repo)) {
    return null;
  }

  const subType = segments.length > 2 ? segments[2].toLowerCase() : null;
  const subIdentifier = segments.length > 3 ? segments[3] : null;

  return {
    owner,
    repo,
    subType,
    subIdentifier,
    isRoot: segments.length === 2,
  };
}

export class GitHubProvider implements MetadataProvider {
  readonly name = 'github';
  readonly priority = 30; // High priority for GitHub links

  /**
   * Matches GitHub repository and sub-resource URLs.
   */
  supports(url: URL): boolean {
    return parseGitHubUrl(url) !== null;
  }

  /**
   * Fetches repository details from GitHub REST API or falls back to website parsing.
   */
  async extract(
    url: URL,
    options?: MetadataExtractionOptions
  ): Promise<NormalizedMetadata> {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return websiteProvider.extract(url, options);
    }

    const { owner, repo, subType, subIdentifier, isRoot } = parsed;
    const sourceUrl = url.href;
    const warnings: string[] = [];

    // Optional server-side token for higher rate limits (never leaked to client)
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DevVault-MetadataEngine/1.0',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let repoData: GitHubRepoResponse | null = null;
    let rateLimitExhausted = false;

    try {
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      const res = await safeFetchJson<GitHubRepoResponse>(apiUrl, {
        headers,
        timeoutMs: 5000,
      });

      repoData = res.data;
    } catch (apiErr) {
      if (apiErr instanceof HTTPError) {
        if (apiErr.httpStatus === 403 || apiErr.httpStatus === 429) {
          rateLimitExhausted = true;
          warnings.push('GitHub API rate limit exceeded; fell back to HTML scraping.');
        } else if (apiErr.httpStatus === 404) {
          warnings.push('Repository not found or private on GitHub API.');
        } else {
          warnings.push(`GitHub API responded with status ${apiErr.httpStatus}.`);
        }
      } else {
        warnings.push(`GitHub API error: ${(apiErr as Error).message}`);
      }
    }

    // Fallback: If GitHub API failed or was rate limited, fetch via websiteProvider
    if (!repoData) {
      const fallbackMeta = await websiteProvider.extract(url, options);
      return {
        ...fallbackMeta,
        platform: 'GITHUB',
        warnings: [...warnings, ...(fallbackMeta.warnings || [])],
      };
    }

    // Build Normalized Metadata from API response
    const image = sanitizeMediaUrl(repoData.owner.avatar_url);
    const publishedAt = repoData.created_at;
    const author = repoData.owner.login;

    // Sub-Resource Handling: Do not misrepresent sub-resources (issues, PRs, releases, code trees)
    if (!isRoot && subType) {
      let subTitle = `${owner}/${repo}`;
      let contentType = 'repository';

      if (subType === 'issues') {
        contentType = 'issue';
        subTitle = subIdentifier
          ? `Issue #${subIdentifier} · ${owner}/${repo}`
          : `Issues · ${owner}/${repo}`;
        warnings.push(
          'GitHub issue page detected. Displaying repository context; individual issue details require authentication.'
        );
      } else if (subType === 'pull') {
        contentType = 'pull_request';
        subTitle = subIdentifier
          ? `Pull Request #${subIdentifier} · ${owner}/${repo}`
          : `Pull Requests · ${owner}/${repo}`;
        warnings.push(
          'GitHub pull request page detected. Displaying repository context; individual PR details require authentication.'
        );
      } else if (subType === 'releases') {
        contentType = 'release';
        subTitle = subIdentifier
          ? `Release ${subIdentifier} · ${owner}/${repo}`
          : `Releases · ${owner}/${repo}`;
      } else if (subType === 'tree' || subType === 'blob') {
        contentType = 'code';
        subTitle = `${repoData.name} (${subType}) · ${owner}`;
      }

      return {
        title: subTitle,
        description: repoData.description || 'GitHub repository resource.',
        image,
        siteName: 'GitHub',
        sourceUrl,
        canonicalUrl: sourceUrl,
        platform: 'GITHUB',
        contentType,
        author,
        publishedAt,
        extractionStatus: 'partial',
        confidence: 0.7,
        extractedAt: new Date().toISOString(),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    // Standard Root Repository Mapping
    const descParts: string[] = [];
    if (repoData.description) descParts.push(repoData.description);
    if (repoData.language) descParts.push(`Language: ${repoData.language}`);
    if (repoData.stargazers_count !== undefined) {
      descParts.push(`★ ${repoData.stargazers_count.toLocaleString()}`);
    }

    const description = descParts.join(' • ') || null;

    return {
      title: `${owner}/${repo}`,
      description,
      image,
      siteName: 'GitHub',
      sourceUrl,
      canonicalUrl: repoData.html_url || sourceUrl,
      platform: 'GITHUB',
      contentType: 'repository',
      author,
      publishedAt,
      extractionStatus: 'success',
      confidence: 0.95,
      extractedAt: new Date().toISOString(),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const githubProvider = new GitHubProvider();
