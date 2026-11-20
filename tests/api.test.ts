import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApiApp, formatApiError, type AirAssistantService } from '../server/app.ts';
import { STARTER_PLAN } from '../src/data/defaultPlan.ts';

async function withServer(
  app: ReturnType<typeof createApiApp>,
  fn: (baseUrl: string) => Promise<void>
) {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const port = (server.address() as AddressInfo).port;
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function createMockService(): AirAssistantService {
  let planCalls = 0;
  let briefCalls = 0;
  let communityCalls = 0;

  return {
    generatePlan: async (profile) => {
      planCalls += 1;
      return {
        data: { ...STARTER_PLAN, city: profile.city, aqiLevel: profile.aqiLevel },
        cached: planCalls > 1,
      };
    },
    fetchLocalBrief: async (city) => {
      briefCalls += 1;
      return {
        data: {
          city,
          advisoryHeadline: `Winter Smog Brief — ${city}`,
          briefText: 'Afternoon thermal mixing improves air between 1 PM and 3 PM.',
          groundingSources: [{ title: 'AirNow', uri: 'https://www.airnow.gov' }],
        },
        cached: briefCalls > 1,
      };
    },
    askAdvisor: async (input) => ({
      question: input.question,
      answer: 'Keep windows closed during inversion peaks and run indoor MERV-13 filtration.',
      impactTakeaway: 'Cuts indoor PM2.5 by up to 65%.',
      actionableChecklist: ['Close street-facing windows', 'Run box fan purifier'],
    }),
    generateCommunityBrief: async (input) => {
      communityCalls += 1;
      return {
        data: {
          city: input.city,
          title: `${input.city} Block Clean-Air Notice`,
          bulletinText: 'Coordinate carpools on red-air mornings.',
          actionBullets: ['Avoid cold-start idling', 'Ventilate at 2 PM'],
          collectiveImpactSummary: `Saves ${input.communityWeeklyCo2Kg} kg CO2e weekly.`,
        },
        cached: communityCalls > 1,
      };
    },
  };
}

test('formatApiError maps configuration, auth, quota, and generic upstream failures cleanly', () => {
  assert.equal(formatApiError(new Error('GEMINI_API_KEY missing')).status, 503);
  assert.equal(formatApiError(new Error('GEMINI_API_KEY missing')).code, 'AI_CONFIG_MISSING');
  assert.equal(formatApiError(new Error('403 PERMISSION_DENIED')).status, 502);
  assert.equal(formatApiError(new Error('403 PERMISSION_DENIED')).code, 'UPSTREAM_AUTH_ERROR');
  assert.equal(formatApiError(new Error('429 RESOURCE_EXHAUSTED')).status, 429);
  assert.equal(formatApiError(new Error('429 RESOURCE_EXHAUSTED')).code, 'UPSTREAM_QUOTA');
  assert.equal(formatApiError('unexpected failure').status, 502);
  assert.equal(formatApiError('unexpected failure').code, 'UPSTREAM_ERROR');
});

test('Express API serves 200 OK with X-Cache headers across plan, local-brief, ask, and community-brief', async () => {
  const app = createApiApp({ service: createMockService(), rateLimitMax: 20 });

  await withServer(app, async (baseUrl) => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.deepEqual(await healthRes.json(), { status: 'ok', service: 'HearthAir' });

    const validProfile = {
      city: 'Denver, CO',
      neighborhoodType: 'valley_basin',
      householdSize: 3,
      hasChildrenOrSeniors: true,
      commuteMode: 'car_solo',
      heatingSource: 'gas_furnace',
      aqiLevel: 155,
    };

    const plan1 = await fetch(`${baseUrl}/api/air-assistant/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer header123.payload456.sig789',
      },
      body: JSON.stringify(validProfile),
    });
    assert.equal(plan1.status, 200);
    assert.equal(plan1.headers.get('x-cache'), 'MISS');
    const plan1Json = (await plan1.json()) as { plan: { city: string }; cached: boolean };
    assert.equal(plan1Json.plan.city, 'Denver, CO');
    assert.equal(plan1Json.cached, false);

    const plan2 = await fetch(`${baseUrl}/api/air-assistant/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validProfile),
    });
    assert.equal(plan2.status, 200);
    assert.equal(plan2.headers.get('x-cache'), 'HIT');

    const brief1 = await fetch(`${baseUrl}/api/air-assistant/local-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'Denver, CO', neighborhoodType: 'valley_basin' }),
    });
    assert.equal(brief1.status, 200);
    assert.equal(brief1.headers.get('x-cache'), 'MISS');

    const askRes = await fetch(`${baseUrl}/api/air-assistant/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Denver, CO',
        aqiLevel: 155,
        hasChildrenOrSeniors: true,
        heatingSource: 'gas_furnace',
        question: 'Can we open bedroom windows at 2 PM?',
      }),
    });
    assert.equal(askRes.status, 200);
    const askJson = (await askRes.json()) as { result: { actionableChecklist: string[] } };
    assert.equal(askJson.result.actionableChecklist.length, 2);

    const comm1 = await fetch(`${baseUrl}/api/air-assistant/community-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Denver, CO',
        aqiLevel: 155,
        participatingHouseholds: 18,
        communityWeeklyCo2Kg: 420,
        indoorPm25ReductionPct: 45,
        focusArea: 'school_zone',
      }),
    });
    assert.equal(comm1.status, 200);
    assert.equal(comm1.headers.get('x-cache'), 'MISS');
  });
});

test('Express API enforces validation 400s, auth header 401s, upstream 503s, and 429 rate limits', async () => {
  const failingService: AirAssistantService = {
    ...createMockService(),
    generatePlan: async () => {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    },
  };
  const app = createApiApp({ service: failingService, rateLimitMax: 2 });

  await withServer(app, async (baseUrl) => {
    const badAuth = await fetch(`${baseUrl}/api/air-assistant/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({
        city: 'Denver',
        aqiLevel: 160,
        hasChildrenOrSeniors: true,
        heatingSource: 'gas_furnace',
        question: 'Can we open windows at noon?',
      }),
    });
    assert.equal(badAuth.status, 401);

    const configMissing = await fetch(`${baseUrl}/api/air-assistant/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Denver',
        neighborhoodType: 'valley_basin',
        householdSize: 2,
        hasChildrenOrSeniors: false,
        commuteMode: 'car_solo',
        heatingSource: 'gas_furnace',
        aqiLevel: 140,
      }),
    });
    assert.equal(configMissing.status, 503);
    const errJson = (await configMissing.json()) as { code: string };
    assert.equal(errJson.code, 'AI_CONFIG_MISSING');

    // 3rd POST hits rateLimitMax: 2
    const rateLimited = await fetch(`${baseUrl}/api/air-assistant/local-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'Denver', neighborhoodType: 'valley_basin' }),
    });
    assert.equal(rateLimited.status, 429);
    const limitJson = (await rateLimited.json()) as { code: string };
    assert.equal(limitJson.code, 'RATE_LIMITED');
  });
});
