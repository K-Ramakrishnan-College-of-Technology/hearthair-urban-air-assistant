export type NeighborhoodType =
  | 'dense_urban'
  | 'suburban_arterial'
  | 'valley_basin'
  | 'industrial_corridor';

export type CommuteMode =
  | 'car_solo'
  | 'carpool'
  | 'public_transit'
  | 'walk_cycle'
  | 'remote_hybrid';

export type HeatingSource =
  | 'gas_furnace'
  | 'electric_heat_pump'
  | 'wood_pellet_stove'
  | 'district_heating'
  | 'radiator_boiler';

export interface HouseholdProfileInput {
  city: string;
  neighborhoodType: NeighborhoodType;
  householdSize: number;
  hasChildrenOrSeniors: boolean;
  commuteMode: CommuteMode;
  heatingSource: HeatingSource;
  aqiLevel: number;
  notes?: string;
}

export interface RoutineStep {
  id: string;
  timeWindow: 'morning' | 'commute' | 'midday' | 'evening';
  clockRange: string;
  title: string;
  action: string;
  co2SavedGrams: number;
  pm25ExposureAvoidedPct: number;
  whyItMatters: string;
}

export interface IndoorHack {
  id: string;
  costTier: 'Free' | 'Low-Cost' | 'Moderate';
  title: string;
  setupSteps: string[];
  pm25ReductionNote: string;
  cadrOrEfficiencyGain: string;
}

export interface SustainableAlternative {
  id: string;
  category: string;
  currentHabit: string;
  sustainableAlternative: string;
  weeklyCo2SavedKg: number;
  householdBenefit: string;
}

export interface ImpactMetrics {
  dailyPm25ExposureReductionPct: number;
  weeklyCo2SavedKg: number;
  cleanAirHoursGainedPerDay: number;
  communityEquivalentNote: string;
}

export interface AirQualityPlanResponse {
  city: string;
  aqiLevel: number;
  commuteMode: CommuteMode;
  heatingSource: HeatingSource;
  peakSmogWindow: string;
  summary: string;
  dailyRoutines: RoutineStep[];
  indoorHacks: IndoorHack[];
  alternatives: SustainableAlternative[];
  impactMetrics: ImpactMetrics;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface LocalBriefResult {
  city: string;
  advisoryHeadline: string;
  briefText: string;
  groundingSources: GroundingSource[];
}

export interface AdvisorAnswerResult {
  question: string;
  answer: string;
  impactTakeaway: string;
  actionableChecklist: string[];
}

export interface SavedAirQualityPlan extends AirQualityPlanResponse {
  id: string;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedAdvisorInteraction {
  id: string;
  ownerId: string;
  city: string;
  question: string;
  answer: string;
  impactTakeaway: string;
  createdAt?: unknown;
}

export interface ImpactLogEntry {
  id: string;
  ownerId: string;
  dateKey: string;
  actionTitle: string;
  category: 'routine' | 'indoor_hack' | 'sustainable_alt';
  co2SavedGrams: number;
  pm25ExposureAvoidedPct: number;
  completed: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}
