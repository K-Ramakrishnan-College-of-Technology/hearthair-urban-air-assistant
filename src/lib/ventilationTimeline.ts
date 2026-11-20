import type { NeighborhoodType } from '../types/air';

export type VentilationStatus = 'purge_safe' | 'caution_brief' | 'keep_sealed';

export interface VentilationSlot {
  hourLabel: string;
  periodLabel: string;
  estimatedAqi: number;
  status: VentilationStatus;
  recommendation: string;
}

export interface VentilationForecast {
  slots: VentilationSlot[];
  bestSlotIndex: number;
  peakSlotIndex: number;
  bestWindowLabel: string;
  peakWindowLabel: string;
  summaryNote: string;
}

const SLOT_METADATA: ReadonlyArray<{ hourLabel: string; periodLabel: string }> = [
  { hourLabel: '00:00', periodLabel: 'Midnight' },
  { hourLabel: '03:00', periodLabel: 'Pre-Dawn' },
  { hourLabel: '06:00', periodLabel: 'Morning Rush' },
  { hourLabel: '09:00', periodLabel: 'Late Morning' },
  { hourLabel: '12:00', periodLabel: 'Midday' },
  { hourLabel: '15:00', periodLabel: 'Afternoon Mix' },
  { hourLabel: '18:00', periodLabel: 'Evening Rush' },
  { hourLabel: '21:00', periodLabel: 'Night Inversion' },
];

const TOPOGRAPHY_MULTIPLIERS: Record<NeighborhoodType, readonly number[]> = {
  valley_basin: [1.08, 1.12, 1.24, 1.05, 0.78, 0.65, 1.18, 1.22],
  dense_urban: [0.95, 0.92, 1.18, 1.1, 0.88, 0.82, 1.24, 1.08],
  suburban_arterial: [0.92, 0.9, 1.14, 0.96, 0.76, 0.68, 1.15, 1.04],
  industrial_corridor: [1.12, 1.16, 1.2, 1.06, 0.86, 0.78, 1.16, 1.18],
};

function classifySlot(
  estimatedAqi: number,
  hasChildrenOrSeniors: boolean
): { status: VentilationStatus; recommendation: string } {
  const safeThreshold = hasChildrenOrSeniors ? 95 : 115;
  const cautionThreshold = hasChildrenOrSeniors ? 140 : 160;

  if (estimatedAqi <= safeThreshold) {
    return {
      status: 'purge_safe',
      recommendation:
        'Safe 10-minute cross-ventilation window: open opposite windows briefly to flush indoor CO2, then close.',
    };
  }
  if (estimatedAqi <= cautionThreshold) {
    return {
      status: 'caution_brief',
      recommendation:
        'Use brief 5-minute venting only if indoor humidity/CO2 feels stale; keep indoor filtration on medium.',
    };
  }
  return {
    status: 'keep_sealed',
    recommendation:
      'Keep street-facing windows sealed; run HEPA or MERV-13 box fan continuously and avoid unvented cooking.',
  };
}

export function calculateVentilationTimeline(input: {
  aqiLevel: number;
  neighborhoodType: NeighborhoodType;
  hasChildrenOrSeniors: boolean;
}): VentilationForecast {
  const baseAqi = Math.max(10, Math.min(500, Math.round(Number(input.aqiLevel) || 0)));
  const multipliers =
    TOPOGRAPHY_MULTIPLIERS[input.neighborhoodType] ?? TOPOGRAPHY_MULTIPLIERS.valley_basin;

  const slots: VentilationSlot[] = SLOT_METADATA.map((meta, idx) => {
    const rawAqi = Math.round(baseAqi * (multipliers[idx] ?? 1));
    const estimatedAqi = Math.max(10, Math.min(500, rawAqi));
    const { status, recommendation } = classifySlot(estimatedAqi, input.hasChildrenOrSeniors);
    return {
      hourLabel: meta.hourLabel,
      periodLabel: meta.periodLabel,
      estimatedAqi,
      status,
      recommendation,
    };
  });

  let bestSlotIndex = 0;
  let peakSlotIndex = 0;
  for (let i = 1; i < slots.length; i++) {
    if (slots[i]!.estimatedAqi < slots[bestSlotIndex]!.estimatedAqi) {
      bestSlotIndex = i;
    }
    if (slots[i]!.estimatedAqi > slots[peakSlotIndex]!.estimatedAqi) {
      peakSlotIndex = i;
    }
  }

  const bestSlot = slots[bestSlotIndex]!;
  const peakSlot = slots[peakSlotIndex]!;

  const summaryNote =
    bestSlot.status === 'keep_sealed'
      ? `Severe ${input.neighborhoodType.replace(/_/g, ' ')} smog keeps all 24h windows elevated—rely on continuous indoor filtration rather than opening windows.`
      : `Lowest outdoor particulate load typically occurs around ${bestSlot.hourLabel} (${bestSlot.periodLabel}); avoid opening windows near ${peakSlot.hourLabel}.`;

  return {
    slots,
    bestSlotIndex,
    peakSlotIndex,
    bestWindowLabel: `${bestSlot.hourLabel} (${bestSlot.periodLabel} · Est. AQI ${bestSlot.estimatedAqi})`,
    peakWindowLabel: `${peakSlot.hourLabel} (${peakSlot.periodLabel} · Est. AQI ${peakSlot.estimatedAqi})`,
    summaryNote,
  };
}
