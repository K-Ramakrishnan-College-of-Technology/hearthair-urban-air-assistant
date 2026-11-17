import type { ImpactSimulationInputs, ImpactSimulationResult } from '../types/air';

/**
 * Deterministic household & neighborhood winter impact estimator.
 * Emission factors:
 * - Avg urban cold-start car roundtrip (~14 km): ~3.1 kg CO2e/day
 * - 1°C winter heating setback for an average urban dwelling: ~1.8 kg CO2e/day
 * - Electric/induction + vented cooking shift vs unvented gas stove: ~0.75 kg CO2e/day
 * - Avg passenger vehicle daily winter emission equivalent: ~4.6 kg CO2e/day
 */
export function calculateImpactSimulation(
  inputs: ImpactSimulationInputs
): ImpactSimulationResult {
  const transitDays = Math.max(0, Math.min(7, Math.round(inputs.transitOrCarpoolDaysPerWeek)));
  const setbackC = Math.max(0, Math.min(4, Number(inputs.thermostatSetbackC) || 0));
  const filtrationHours = Math.max(0, Math.min(24, Math.round(inputs.indoorFiltrationHoursPerDay)));
  const households = Math.max(1, Math.min(200, Math.round(inputs.participatingHouseholds)));

  const commuteCo2KgPerWeek = transitDays * 3.1;
  const heatingCo2KgPerWeek = setbackC * 1.8 * 7;
  const cookingCo2KgPerWeek = inputs.cleanCookingExhaust ? 0.75 * 7 : 0;

  const householdWeeklyCo2Kg = Number(
    (commuteCo2KgPerWeek + heatingCo2KgPerWeek + cookingCo2KgPerWeek).toFixed(1)
  );
  const seasonal90DayCo2Kg = Number(((householdWeeklyCo2Kg / 7) * 90).toFixed(0));

  // Indoor PM2.5 exposure reduction model (capped at 78% realistic maximum)
  const filtrationReduction = Math.min(45, filtrationHours * 3.2);
  const cookingReduction = inputs.cleanCookingExhaust ? 18 : 0;
  const transitReduction = Math.min(15, transitDays * 3);
  const indoorPm25ReductionPct = Math.min(
    78,
    Math.round(filtrationReduction + cookingReduction + transitReduction)
  );

  // Clean breathing hours gained per day scales with filtration runtime & cooking control
  const cleanAirHoursGainedDaily = Number(
    Math.min(18, filtrationHours * 0.65 + (inputs.cleanCookingExhaust ? 2.2 : 0)).toFixed(1)
  );

  const communityWeeklyCo2Kg = Number((householdWeeklyCo2Kg * households).toFixed(1));
  const equivalentCarsOffRoadDaily = Number(
    (communityWeeklyCo2Kg / 7 / 4.6).toFixed(1)
  );

  return {
    householdWeeklyCo2Kg,
    seasonal90DayCo2Kg,
    indoorPm25ReductionPct,
    cleanAirHoursGainedDaily,
    communityWeeklyCo2Kg,
    equivalentCarsOffRoadDaily,
  };
}
