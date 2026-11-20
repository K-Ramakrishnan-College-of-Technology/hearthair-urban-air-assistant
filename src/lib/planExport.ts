import type {
  AirQualityPlanResponse,
  CommunityBriefResult,
  ImpactSimulationInputs,
  ImpactSimulationResult,
} from '../types/air';

export function formatPlanAsText(
  plan: AirQualityPlanResponse,
  simInputs: ImpactSimulationInputs,
  simResult: ImpactSimulationResult,
  communityBrief: CommunityBriefResult | null
): string {
  const lines = [
    `HearthAir Household & Community Winter Plan — ${plan.city}`,
    `Target AQI: ${plan.aqiLevel} | Peak Smog Window: ${plan.peakSmogWindow}`,
    '',
    'Summary:',
    plan.summary,
    '',
    'Daily Low-Emission Routines:',
    ...plan.dailyRoutines.map(
      (r) =>
        `- [${r.clockRange}] ${r.title}: ${r.action} (-${r.co2SavedGrams}g CO2e, -${r.pm25ExposureAvoidedPct}% PM2.5)`
    ),
    '',
    'Indoor Air Quality Hacks:',
    ...plan.indoorHacks.map(
      (h) => `- (${h.costTier}) ${h.title}: ${h.pm25ReductionNote}`
    ),
    '',
    `Simulated Collective Impact (${simInputs.participatingHouseholds} households):`,
    `- Weekly CO2e Reduced: ${simResult.communityWeeklyCo2Kg} kg/week (${simResult.equivalentCarsOffRoadDaily} cars/day equivalent)`,
    `- Indoor PM2.5 Exposure Reduction: -${simResult.indoorPm25ReductionPct}%`,
  ];

  if (communityBrief) {
    lines.push(
      '',
      'Neighborhood Bulletin:',
      communityBrief.title,
      communityBrief.bulletinText,
      ...communityBrief.actionBullets.map((b) => `- ${b}`)
    );
  }

  return lines.join('\n');
}
