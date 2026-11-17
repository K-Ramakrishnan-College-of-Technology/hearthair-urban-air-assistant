import { z } from 'zod';

export const ProfilePlanSchema = z.object({
  city: z.string().trim().min(2).max(100),
  neighborhoodType: z.enum([
    'dense_urban',
    'suburban_arterial',
    'valley_basin',
    'industrial_corridor',
  ]),
  householdSize: z.number().int().min(1).max(20),
  hasChildrenOrSeniors: z.boolean(),
  commuteMode: z.enum([
    'car_solo',
    'carpool',
    'public_transit',
    'walk_cycle',
    'remote_hybrid',
  ]),
  heatingSource: z.enum([
    'gas_furnace',
    'electric_heat_pump',
    'wood_pellet_stove',
    'district_heating',
    'radiator_boiler',
  ]),
  aqiLevel: z.number().int().min(0).max(500),
  notes: z.string().trim().max(400).optional(),
});

export const LocalBriefSchema = z.object({
  city: z.string().trim().min(2).max(100),
  neighborhoodType: z.enum([
    'dense_urban',
    'suburban_arterial',
    'valley_basin',
    'industrial_corridor',
  ]),
});

export const AskAdvisorSchema = z.object({
  city: z.string().trim().min(2).max(100),
  aqiLevel: z.number().int().min(0).max(500),
  hasChildrenOrSeniors: z.boolean(),
  heatingSource: z.string().trim().min(2).max(40),
  question: z.string().trim().min(4).max(800),
});

export const CommunityBriefSchema = z.object({
  city: z.string().trim().min(2).max(100),
  aqiLevel: z.number().int().min(0).max(500),
  participatingHouseholds: z.number().int().min(1).max(200),
  communityWeeklyCo2Kg: z.number().min(0).max(100000),
  indoorPm25ReductionPct: z.number().min(0).max(100),
  focusArea: z.enum(['school_zone', 'apartment_building', 'neighborhood_block']),
});

export function sanitizeForPrompt(value: string, maxLen: number): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return value;
    }
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        clean[k] = stripUndefined(v);
      }
    }
    return clean as T;
  }
  return value;
}

export function getAqiSeverity(aqi: number): {
  label: string;
  textClass: string;
  surfaceClass: string;
} {
  if (aqi <= 50) {
    return {
      label: 'Good',
      textClass: 'text-emerald-700',
      surfaceClass: 'bg-emerald-50 border-emerald-200',
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      textClass: 'text-amber-700',
      surfaceClass: 'bg-amber-50 border-amber-200',
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      textClass: 'text-amber-800',
      surfaceClass: 'bg-amber-50 border-amber-300',
    };
  }
  if (aqi <= 200) {
    return {
      label: 'Unhealthy Winter Smog',
      textClass: 'text-red-700',
      surfaceClass: 'bg-red-50 border-red-200',
    };
  }
  return {
    label: 'Severe Inversion Alert',
    textClass: 'text-red-800',
    surfaceClass: 'bg-red-100 border-red-300',
  };
}
