/**
 * DevVault — Metadata Extraction API Route
 * 
 * POST /api/metadata/extract
 * 
 * Protected endpoint for authenticated metadata extraction with SSRF defense,
 * Zod validation, sliding-window rate limiting, and structured error responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  MetadataError,
  metadataExtractor,
  metadataRateLimiter,
} from '@/lib/metadata';
import { createServerSupabase } from '@/lib/supabase/server';

const ExtractRequestSchema = z.object({
  url: z.string({
    required_error: 'URL is required.',
    invalid_type_error: 'URL must be a string.',
  }).url('The provided string is not a valid URL format.'),
  skipCache: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get('authorization') || '';
    const isBearer = authHeader.toLowerCase().startsWith('bearer ');
    const bearerToken = isBearer ? authHeader.substring(7).trim() : null;

    let userId: string | null = null;

    // Check development/testing bypass in non-production
    if (
      process.env.NODE_ENV !== 'production' &&
      bearerToken === 'devvault-test-token'
    ) {
      userId = 'dev-test-user-0000-0000-000000000000';
    } else {
      const supabase = await createServerSupabase();

      if (supabase) {
        if (bearerToken) {
          const { data: { user } } = await supabase.auth.getUser(bearerToken);
          userId = user?.id ?? null;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id ?? null;
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in or provide a valid session token.',
        },
        { status: 401 }
      );
    }

    // 2. Sliding Window Rate Limiting (30 req / 60 sec per user)
    const rateLimit = metadataRateLimiter.check(userId);
    const rateLimitHeaders: Record<string, string> = {
      'X-RateLimit-Limit': String(rateLimit.totalLimit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(Math.ceil((Date.now() + rateLimit.resetMs) / 1000)),
    };

    if (rateLimit.limited) {
      rateLimitHeaders['Retry-After'] = String(Math.ceil(rateLimit.resetMs / 1000));
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please wait before extracting more links.',
        },
        {
          status: 429,
          headers: rateLimitHeaders,
        }
      );
    }

    // 3. Parse and Validate Request Body
    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Bad Request',
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON.',
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const parseResult = ExtractRequestSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid request body.';
      return NextResponse.json(
        {
          error: 'Bad Request',
          code: 'VALIDATION_ERROR',
          message: firstError,
          details: parseResult.error.flatten(),
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { url, skipCache } = parseResult.data;

    // 4. Extract Metadata
    const metadata = await metadataExtractor.extract(url, {
      skipCache,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: metadata,
      },
      {
        status: 200,
        headers: rateLimitHeaders,
      }
    );
  } catch (err: unknown) {
    // 5. Handle Known Metadata and SSRF Errors
    if (err instanceof MetadataError) {
      return NextResponse.json(
        {
          error: err.name,
          code: err.code,
          message: err.message,
        },
        { status: err.statusCode }
      );
    }

    // 6. Generic Internal Server Error (Never leak stack traces)
    console.error('[API /api/metadata/extract] Unhandled error:', err);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing metadata.',
      },
      { status: 500 }
    );
  }
}
