import express from 'express';
import type { ZodType } from 'zod';
import {
  askAirAdvisor,
  fetchLocalWinterBriefCached,
  generateAirQualityPlanCached,
  generateCommunityBriefCached,
} from './gemini.ts';
import {
  AskAdvisorSchema,
  CommunityBriefSchema,
  LocalBriefSchema,
  ProfilePlanSchema,
} from '../src/lib/sanitizers.ts';

export interface AirAssistantService {
  generatePlan: typeof generateAirQualityPlanCached;
  fetchLocalBrief: typeof fetchLocalWinterBriefCached;
  askAdvisor: typeof askAirAdvisor;
  generateCommunityBrief: typeof generateCommunityBriefCached;
}

export interface ApiAppOptions {
  service?: AirAssistantService;
  rateLimitMax?: number;
}

const DEFAULT_SERVICE: AirAssistantService = {
  generatePlan: generateAirQualityPlanCached,
  fetchLocalBrief: fetchLocalWinterBriefCached,
  askAdvisor: askAirAdvisor,
  generateCommunityBrief: generateCommunityBriefCached,
};

function createRateLimiter(maxRequests: number) {
  const rateBucket = new Map<string, { count: number; resetAt: number }>();

  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = rateBucket.get(ip);
    if (!entry || now > entry.resetAt) {
      rateBucket.set(ip, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    if (entry.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please wait a minute before trying again.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    entry.count += 1;
    next();
  };
}

function validateAuthHeaderFormat(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader !== undefined) {
    if (
      typeof authHeader !== 'string' ||
      !/^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(authHeader)
    ) {
      res.status(401).json({
        error: 'Malformed authorization token format.',
        code: 'INVALID_AUTH_HEADER',
      });
      return;
    }
  }
  next();
}

export function formatApiError(error: unknown): { status: number; message: string; code: string } {
  const msg = error instanceof Error ? error.message : String(error);
  if (/GEMINI_API_KEY/i.test(msg)) {
    return {
      status: 503,
      message:
        'Server AI configuration is unavailable. Please ensure GEMINI_API_KEY is set in Settings > Secrets.',
      code: 'AI_CONFIG_MISSING',
    };
  }
  if (/403|PERMISSION_DENIED|API_KEY_INVALID/i.test(msg)) {
    return {
      status: 502,
      message:
        'Gemini API authentication failed. Please check the API key in Settings > Secrets.',
      code: 'UPSTREAM_AUTH_ERROR',
    };
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return {
      status: 429,
      message: 'AI quota temporarily exceeded. Please wait a moment and retry.',
      code: 'UPSTREAM_QUOTA',
    };
  }
  return {
    status: 502,
    message: 'Unable to complete AI air quality request right now. Please try again.',
    code: 'UPSTREAM_ERROR',
  };
}

function createValidatedHandler<TInput>(
  schema: ZodType<TInput>,
  invalidMessage: string,
  handler: (input: TInput, res: express.Response) => Promise<void>
): express.RequestHandler {
  return async (req, res) => {
    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      res.status(400).json({
        error: invalidMessage,
        details: parsed.error.issues.map((issue) => issue.message),
      });
      return;
    }

    try {
      await handler(parsed.data, res);
    } catch (error) {
      const formatted = formatApiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  };
}

export function createApiApp(options: ApiAppOptions = {}): express.Express {
  const app = express();
  const service = options.service ?? DEFAULT_SERVICE;
  const checkRateLimit = createRateLimiter(options.rateLimitMax ?? 30);

  // Top-level request deserialization MUST be registered before all route handlers
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'HearthAir' });
  });

  app.post(
    '/api/air-assistant/plan',
    checkRateLimit,
    validateAuthHeaderFormat,
    createValidatedHandler(
      ProfilePlanSchema,
      'Invalid household profile parameters.',
      async (input, res) => {
        const { data: plan, cached } = await service.generatePlan(input);
        res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
        res.json({ plan, cached });
      }
    )
  );

  app.post(
    '/api/air-assistant/local-brief',
    checkRateLimit,
    validateAuthHeaderFormat,
    createValidatedHandler(
      LocalBriefSchema,
      'Invalid location parameters.',
      async (input, res) => {
        const { data: brief, cached } = await service.fetchLocalBrief(
          input.city,
          input.neighborhoodType
        );
        res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
        res.json({ brief, cached });
      }
    )
  );

  app.post(
    '/api/air-assistant/ask',
    checkRateLimit,
    validateAuthHeaderFormat,
    createValidatedHandler(
      AskAdvisorSchema,
      'Please enter a valid question (4 to 800 characters).',
      async (input, res) => {
        const result = await service.askAdvisor(input);
        res.json({ result });
      }
    )
  );

  app.post(
    '/api/air-assistant/community-brief',
    checkRateLimit,
    validateAuthHeaderFormat,
    createValidatedHandler(
      CommunityBriefSchema,
      'Invalid community brief parameters.',
      async (input, res) => {
        const { data: communityBrief, cached } = await service.generateCommunityBrief(input);
        res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
        res.json({ communityBrief, cached });
      }
    )
  );

  return app;
}
