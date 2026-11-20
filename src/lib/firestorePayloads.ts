import { stripUndefined } from './sanitizers.ts';
import type {
  AdvisorAnswerResult,
  AirQualityPlanResponse,
  HouseholdProfileInput,
} from '../types/air.ts';

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildHouseholdProfilePayload(profile: HouseholdProfileInput) {
  return stripUndefined({
    city: profile.city.trim().slice(0, 100),
    neighborhoodType: profile.neighborhoodType,
    householdSize: Math.max(1, Math.min(20, Math.round(profile.householdSize))),
    hasChildrenOrSeniors: Boolean(profile.hasChildrenOrSeniors),
    commuteMode: profile.commuteMode,
    heatingSource: profile.heatingSource,
  });
}

export function buildAirQualityPlanPayload(
  userId: string,
  plan: AirQualityPlanResponse
) {
  return stripUndefined({
    ownerId: userId,
    city: plan.city.trim().slice(0, 100),
    aqiLevel: Math.max(0, Math.min(500, Math.round(plan.aqiLevel))),
    commuteMode: String(plan.commuteMode).slice(0, 40),
    heatingSource: String(plan.heatingSource).slice(0, 40),
    summary: plan.summary.slice(0, 2000),
    dailyRoutines: plan.dailyRoutines.slice(0, 8),
    indoorHacks: plan.indoorHacks.slice(0, 8),
    alternatives: plan.alternatives.slice(0, 6),
    impactMetrics: {
      dailyPm25ExposureReductionPct: plan.impactMetrics.dailyPm25ExposureReductionPct,
      weeklyCo2SavedKg: plan.impactMetrics.weeklyCo2SavedKg,
      cleanAirHoursGainedPerDay: plan.impactMetrics.cleanAirHoursGainedPerDay,
      communityEquivalentNote: plan.impactMetrics.communityEquivalentNote.slice(0, 400),
    },
  });
}

export function buildAdvisorInteractionPayload(
  userId: string,
  city: string,
  result: AdvisorAnswerResult
) {
  return stripUndefined({
    ownerId: userId,
    city: city.trim().slice(0, 100),
    question: result.question.trim().slice(0, 1000),
    answer: result.answer.trim().slice(0, 4000),
    impactTakeaway: result.impactTakeaway.trim().slice(0, 600),
  });
}

export function buildImpactLogPayload(
  userId: string,
  entry: {
    actionTitle: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    co2SavedGrams: number;
    pm25ExposureAvoidedPct: number;
  },
  dateKey = getTodayDateKey()
) {
  return stripUndefined({
    ownerId: userId,
    dateKey,
    actionTitle: entry.actionTitle.trim().slice(0, 160),
    category: entry.category,
    co2SavedGrams: Math.max(0, Math.min(500000, Number(entry.co2SavedGrams) || 0)),
    pm25ExposureAvoidedPct: Math.max(
      0,
      Math.min(100, Number(entry.pm25ExposureAvoidedPct) || 0)
    ),
    completed: true,
  });
}
