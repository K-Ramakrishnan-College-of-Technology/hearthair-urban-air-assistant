import express from 'express';
import {
  askAirAdvisor,
  fetchLocalWinterBrief,
  generateAirQualityPlan,
} from './gemini.ts';
import {
  AskAdvisorSchema,
  LocalBriefSchema,
  ProfilePlanSchema,
} from '../src/lib/sanitizers.ts';

const rateBucket = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(ip, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (entry.count >= 30) {
    res.status(429).json({
      error: 'Too many requests. Please wait a minute before trying again.',
      code: 'RATE_LIMITED',
    });
    return;
  }
  entry.count += 1;
  next();
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

function formatApiError(error: unknown): { status: number; message: string; code: string } {
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

export function createApiApp(): express.Express {
  const app = express();

  // Top-level request deserialization MUST be registered before all route handlers
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'HearthAir' });
  });

  app.post(
    '/api/air-assistant/plan',
    checkRateLimit,
    validateAuthHeaderFormat,
    async (req, res) => {
      const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
      const parsed = ProfilePlanSchema.safeParse(rawBody);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid household profile parameters.',
          details: parsed.error.issues.map((issue) => issue.message),
        });
        return;
      }

      try {
        const plan = await generateAirQualityPlan(parsed.data);
        res.json({ plan });
      } catch (error) {
        const formatted = formatApiError(error);
        res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
      }
    }
  );

  app.post(
    '/api/air-assistant/local-brief',
    checkRateLimit,
    validateAuthHeaderFormat,
    async (req, res) => {
      const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
      const parsed = LocalBriefSchema.safeParse(rawBody);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid location parameters.',
          details: parsed.error.issues.map((issue) => issue.message),
        });
        return;
      }

      try {
        const brief = await fetchLocalWinterBrief(
          parsed.data.city,
          parsed.data.neighborhoodType
        );
        res.json({ brief });
      } catch (error) {
        const formatted = formatApiError(error);
        res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
      }
    }
  );

  app.post(
    '/api/air-assistant/ask',
    checkRateLimit,
    validateAuthHeaderFormat,
    async (req, res) => {
      const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
      const parsed = AskAdvisorSchema.safeParse(rawBody);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Please enter a valid question (4 to 800 characters).',
          details: parsed.error.issues.map((issue) => issue.message),
        });
        return;
      }

      try {
        const result = await askAirAdvisor(parsed.data);
        res.json({ result });
      } catch (error) {
        const formatted = formatApiError(error);
        res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
      }
    }
  );

  return app;
}
