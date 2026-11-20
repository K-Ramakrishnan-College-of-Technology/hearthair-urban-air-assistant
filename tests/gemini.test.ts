import assert from 'node:assert/strict';
import test from 'node:test';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { TtlLruCache } from '../server/cache.ts';
import {
  askAirAdvisor,
  fetchLocalWinterBrief,
  fetchLocalWinterBriefCached,
  generateAirQualityPlan,
  generateAirQualityPlanCached,
  generateCommunityBrief,
  generateCommunityBriefCached,
  generateContentWithFallback,
  isRecoverableError,
  MODEL_FALLBACK_LADDER,
  normalizeAirQualityPlan,
} from '../server/gemini.ts';
import type {
  AirQualityPlanResponse,
  CommunityBriefResult,
  HouseholdProfileInput,
  LocalBriefResult,
} from '../src/types/air.ts';

const SAMPLE_PROFILE: HouseholdProfileInput = {
  city: 'Salt Lake City, UT',
  neighborhoodType: 'valley_basin',
  householdSize: 4,
  hasChildrenOrSeniors: true,
  commuteMode: 'car_solo',
  heatingSource: 'gas_furnace',
  aqiLevel: 172,
  notes: 'School walks at 4 PM <ignore>',
};

test('isRecoverableError identifies transient status codes and error messages while rejecting 400s', () => {
  assert.equal(isRecoverableError({ status: 503 }), true);
  assert.equal(isRecoverableError({ status: 429 }), true);
  assert.equal(isRecoverableError({ status: 404 }), true);
  assert.equal(isRecoverableError({ status: 500 }), true);
  assert.equal(isRecoverableError(new Error('503 UNAVAILABLE from upstream')), true);
  assert.equal(isRecoverableError(new Error('429 RESOURCE_EXHAUSTED')), true);
  assert.equal(isRecoverableError({ status: 400, message: 'Bad Request' }), false);
  assert.equal(isRecoverableError(null), false);
});

test('generateContentWithFallback succeeds on primary model and falls back across recoverable failures', async () => {
  const modelsTried: string[] = [];
  let sawThinkingOnLite = true;

  const response = await generateContentWithFallback(
    {
      contents: 'Generate plan',
      config: {
        thinkingConfig: { thinkingBudget: 128 },
      },
    },
    {
      sleep: async () => {},
      generateContent: async (params: GenerateContentParameters) => {
        modelsTried.push(params.model);
        if (params.model === MODEL_FALLBACK_LADDER[0]) {
          throw Object.assign(new Error('503 UNAVAILABLE'), { status: 503 });
        }
        if (params.model === MODEL_FALLBACK_LADDER[1]) {
          sawThinkingOnLite = Boolean(params.config?.thinkingConfig);
          throw Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 });
        }
        return { text: '{"ok":true}' } as GenerateContentResponse;
      },
    }
  );

  assert.equal(response.text, '{"ok":true}');
  assert.deepEqual(modelsTried, [...MODEL_FALLBACK_LADDER]);
  assert.equal(sawThinkingOnLite, false);
});

test('generateContentWithFallback fails fast on non-recoverable 400 errors and throws after exhaustion', async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      generateContentWithFallback(
        { contents: 'bad' },
        {
          sleep: async () => {},
          generateContent: async () => {
            attempts += 1;
            throw Object.assign(new Error('400 INVALID_ARGUMENT'), { status: 400 });
          },
        }
      ),
    /INVALID_ARGUMENT/
  );
  assert.equal(attempts, 1);

  let exhaustionAttempts = 0;
  await assert.rejects(
    () =>
      generateContentWithFallback(
        { contents: 'down' },
        {
          sleep: async () => {},
          generateContent: async () => {
            exhaustionAttempts += 1;
            throw Object.assign(new Error('503 UNAVAILABLE'), { status: 503 });
          },
        }
      ),
    /503 UNAVAILABLE/
  );
  assert.equal(exhaustionAttempts, MODEL_FALLBACK_LADDER.length);
});

test('normalizeAirQualityPlan clamps numeric metrics and falls back invalid enums', () => {
  const normalized = normalizeAirQualityPlan(
    {
      peakSmogWindow: '07:00-09:30',
      summary: 'Valley inversion traps tailpipe smoke.',
      dailyRoutines: [
        {
          id: 'r1',
          timeWindow: 'invalid_window' as unknown as 'morning',
          clockRange: '08:00-09:00',
          title: 'Seal windows',
          action: 'Close street-facing sashes.',
          co2SavedGrams: -50,
          pm25ExposureAvoidedPct: 250,
          whyItMatters: 'Stops cold inversion infiltration.',
        },
      ],
      indoorHacks: [
        {
          id: 'h1',
          costTier: 'Expensive' as unknown as 'Free',
          title: 'Box fan cube',
          setupSteps: ['Tape 4 filters'],
          pm25ReductionNote: 'Cuts PM2.5 indoors.',
          cadrOrEfficiencyGain: '350 CFM',
        },
      ],
      alternatives: [
        {
          id: 'a1',
          category: 'Transit',
          currentHabit: 'Solo driving',
          sustainableAlternative: 'Rail feeder',
          weeklyCo2SavedKg: 9999,
          householdBenefit: 'Lower fuel cost.',
        },
      ],
      impactMetrics: {
        dailyPm25ExposureReductionPct: 140,
        weeklyCo2SavedKg: 25,
        cleanAirHoursGainedPerDay: 30,
        communityEquivalentNote: 'Significant neighborhood savings.',
      },
    },
    SAMPLE_PROFILE,
    'Salt Lake City, UT'
  );

  assert.equal(normalized.dailyRoutines[0]?.timeWindow, 'morning');
  assert.equal(normalized.dailyRoutines[0]?.co2SavedGrams, 0);
  assert.equal(normalized.dailyRoutines[0]?.pm25ExposureAvoidedPct, 100);
  assert.equal(normalized.indoorHacks[0]?.costTier, 'Low-Cost');
  assert.equal(normalized.alternatives[0]?.weeklyCo2SavedKg, 500);
  assert.equal(normalized.impactMetrics.dailyPm25ExposureReductionPct, 100);
  assert.equal(normalized.impactMetrics.cleanAirHoursGainedPerDay, 24);
});

test('generateAirQualityPlan & generateAirQualityPlanCached sanitize prompt input and cache results', async () => {
  let callCount = 0;
  const mockPayload = {
    peakSmogWindow: '06:30-09:00',
    summary: 'Keep filtration running.',
    dailyRoutines: [
      {
        id: 'r1',
        timeWindow: 'morning',
        clockRange: '07:00-08:30',
        title: 'Run HEPA',
        action: 'Set purifier to medium.',
        co2SavedGrams: 120,
        pm25ExposureAvoidedPct: 32,
        whyItMatters: 'Lowers indoor particulates.',
      },
    ],
    indoorHacks: [
      {
        id: 'h1',
        costTier: 'Free',
        title: 'Rear burner cooking',
        setupSteps: ['Use lid'],
        pm25ReductionNote: 'Cuts cooking peaks.',
        cadrOrEfficiencyGain: 'Zero cost',
      },
    ],
    alternatives: [
      {
        id: 'a1',
        category: 'Commute',
        currentHabit: 'Solo car',
        sustainableAlternative: 'Carpool',
        weeklyCo2SavedKg: 12,
        householdBenefit: 'Less fuel burned.',
      },
    ],
    impactMetrics: {
      dailyPm25ExposureReductionPct: 35,
      weeklyCo2SavedKg: 18,
      cleanAirHoursGainedPerDay: 6,
      communityEquivalentNote: 'Strong block impact.',
    },
  };

  const deps = {
    sleep: async () => {},
    generateContent: async (params: GenerateContentParameters) => {
      callCount += 1;
      assert.equal(String(params.contents).includes('<ignore>'), false);
      return { text: JSON.stringify(mockPayload) } as GenerateContentResponse;
    },
  };

  const cache = new TtlLruCache<AirQualityPlanResponse>(10, 60_000);
  const first = await generateAirQualityPlanCached(SAMPLE_PROFILE, cache, deps);
  const second = await generateAirQualityPlanCached(SAMPLE_PROFILE, cache, deps);

  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(callCount, 1);
  assert.equal(second.data.city, 'Salt Lake City, UT');

  await assert.rejects(
    () =>
      generateAirQualityPlan(SAMPLE_PROFILE, {
        generateContent: async () => ({ text: '   ' }) as GenerateContentResponse,
      }),
    /empty plan response/
  );
});

test('fetchLocalWinterBrief & cached wrapper deduplicate grounding URLs and reject empty text', async () => {
  let calls = 0;
  const cache = new TtlLruCache<LocalBriefResult>(10, 60_000);

  const deps = {
    generateContent: async () => {
      calls += 1;
      return {
        text: 'Cold air pools in the valley floor until mid-afternoon.',
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                { web: { uri: 'https://airnow.gov/slc', title: 'AirNow SLC' } },
                { web: { uri: 'https://airnow.gov/slc', title: 'Duplicate' } },
                { web: { uri: 'https://deq.utah.gov/winter', title: 'Utah DEQ' } },
              ],
            },
          },
        ],
      } as unknown as GenerateContentResponse;
    },
  };

  const first = await fetchLocalWinterBriefCached('Salt Lake City', 'valley_basin', cache, deps);
  const second = await fetchLocalWinterBriefCached('salt lake city', 'valley_basin', cache, deps);

  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
  assert.equal(first.data.groundingSources.length, 2);
  assert.equal(first.data.groundingSources[0]?.title, 'AirNow SLC');

  await assert.rejects(
    () =>
      fetchLocalWinterBrief('Denver', 'dense_urban', {
        generateContent: async () => ({ text: '' }) as GenerateContentResponse,
      }),
    /Could not generate local air quality brief/
  );
});

test('askAirAdvisor and generateCommunityBriefCached parse structured JSON and cache community notices', async () => {
  const advisorRes = await askAirAdvisor(
    {
      city: 'Denver',
      aqiLevel: 165,
      hasChildrenOrSeniors: true,
      heatingSource: 'gas_furnace',
      question: 'Should we run the range hood?',
    },
    {
      generateContent: async () =>
        ({
          text: JSON.stringify({
            answer: 'Always vent outdoors while cooking.',
            impactTakeaway: 'Cuts indoor NO2 by 60%.',
            actionableChecklist: ['Turn on hood 5 min early', 'Use back burners'],
          }),
        }) as GenerateContentResponse,
    }
  );
  assert.equal(advisorRes.answer, 'Always vent outdoors while cooking.');
  assert.equal(advisorRes.actionableChecklist.length, 2);

  let briefCalls = 0;
  const briefCache = new TtlLruCache<CommunityBriefResult>(10, 60_000);
  const briefDeps = {
    generateContent: async () => {
      briefCalls += 1;
      return {
        text: JSON.stringify({
          title: 'School Zone Clean Air Bulletin',
          bulletinText: 'Please turn off idling engines during pickup.',
          actionBullets: ['No idling over 30s', 'Carpool Thursdays'],
          collectiveImpactSummary: 'Saves 310 kg CO2e weekly.',
        }),
      } as GenerateContentResponse;
    },
  };

  const b1 = await generateCommunityBriefCached(
    {
      city: 'Denver',
      aqiLevel: 165,
      participatingHouseholds: 18,
      communityWeeklyCo2Kg: 310,
      indoorPm25ReductionPct: 42,
      focusArea: 'school_zone',
    },
    briefCache,
    briefDeps
  );
  const b2 = await generateCommunityBriefCached(
    {
      city: 'Denver',
      aqiLevel: 166,
      participatingHouseholds: 18,
      communityWeeklyCo2Kg: 310.2,
      indoorPm25ReductionPct: 42,
      focusArea: 'school_zone',
    },
    briefCache,
    briefDeps
  );
  assert.equal(b1.cached, false);
  assert.equal(b2.cached, true);
  assert.equal(briefCalls, 1);

  await assert.rejects(
    () =>
      generateCommunityBrief(
        {
          city: 'Denver',
          aqiLevel: 160,
          participatingHouseholds: 10,
          communityWeeklyCo2Kg: 100,
          indoorPm25ReductionPct: 30,
          focusArea: 'apartment_building',
        },
        {
          generateContent: async () => ({ text: '' }) as GenerateContentResponse,
        }
      ),
    /empty response/
  );
});
