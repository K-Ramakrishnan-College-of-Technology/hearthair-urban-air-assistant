import { useMemo, useState } from 'react';
import { Clock, ShieldAlert, Wind } from 'lucide-react';
import {
  calculateVentilationTimeline,
  type VentilationSlot,
} from '../lib/ventilationTimeline';
import type { HouseholdProfileInput } from '../types/air';

interface VentilationTimelineProps {
  profile: HouseholdProfileInput;
}

const STATUS_META: Record<
  VentilationSlot['status'],
  { label: string; barClass: string; textClass: string }
> = {
  purge_safe: {
    label: 'Safe 10-Min Purge',
    barClass: 'bg-teal-700',
    textClass: 'text-teal-800',
  },
  caution_brief: {
    label: 'Brief Vent Only',
    barClass: 'bg-amber-600',
    textClass: 'text-amber-800',
  },
  keep_sealed: {
    label: 'Keep Sealed + HEPA',
    barClass: 'bg-red-700',
    textClass: 'text-red-800',
  },
};

const HEIGHT_CLASSES = ['h-3', 'h-4', 'h-6', 'h-8', 'h-10', 'h-12', 'h-14'] as const;

function getBarHeightClass(estimatedAqi: number, maxAqi: number): string {
  const ratio = Math.max(0, Math.min(1, estimatedAqi / Math.max(maxAqi, 100)));
  const index = Math.min(
    HEIGHT_CLASSES.length - 1,
    Math.floor(ratio * HEIGHT_CLASSES.length)
  );
  return HEIGHT_CLASSES[index] ?? 'h-6';
}

export function VentilationTimeline({ profile }: VentilationTimelineProps) {
  const forecast = useMemo(
    () =>
      calculateVentilationTimeline({
        aqiLevel: profile.aqiLevel,
        neighborhoodType: profile.neighborhoodType,
        hasChildrenOrSeniors: profile.hasChildrenOrSeniors,
      }),
    [profile.aqiLevel, profile.neighborhoodType, profile.hasChildrenOrSeniors]
  );

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const activeIdx =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < forecast.slots.length
      ? selectedIdx
      : forecast.bestSlotIndex;
  const activeSlot = forecast.slots[activeIdx] ?? forecast.slots[0]!;
  const maxAqi = Math.max(...forecast.slots.map((s) => s.estimatedAqi), 100);
  const activeMeta = STATUS_META[activeSlot.status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-800">
            <Wind className="w-3.5 h-3.5" aria-hidden="true" />
            <span>24-Hour Inversion & Safe Window-Venting Model</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Hourly Ventilation Timing for {profile.city}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            {forecast.summaryNote}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs shrink-0">
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-slate-500">Lowest Particulate Window</span>
            <span className="font-mono tabular-nums font-semibold text-teal-800">
              {forecast.bestWindowLabel}
            </span>
          </div>
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-slate-500">Peak Inversion Trap</span>
            <span className="font-mono tabular-nums font-semibold text-red-800">
              {forecast.peakWindowLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive 8-Slot Timeline */}
      <div
        role="group"
        aria-label="Select a 3-hour window to inspect ventilation advice"
        className="grid grid-cols-4 sm:grid-cols-8 gap-2"
      >
        {forecast.slots.map((slot, idx) => {
          const isSelected = idx === activeIdx;
          const meta = STATUS_META[slot.status];
          const heightClass = getBarHeightClass(slot.estimatedAqi, maxAqi);

          return (
            <button
              key={slot.hourLabel}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${slot.hourLabel} ${slot.periodLabel}, estimated AQI ${slot.estimatedAqi}, ${meta.label}`}
              onClick={() => setSelectedIdx(idx)}
              className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[11px] font-mono tabular-nums font-semibold">
                  {slot.hourLabel}
                </span>
                <span
                  className={`text-[11px] font-mono tabular-nums ${
                    isSelected ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {slot.estimatedAqi}
                </span>
              </div>

              <div className="w-full h-14 flex items-end bg-slate-200/60 rounded overflow-hidden">
                <div className={`w-full rounded-t transition-all ${meta.barClass} ${heightClass}`} />
              </div>

              <span
                className={`text-[11px] truncate w-full ${
                  isSelected ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {slot.periodLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Window Guidance */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {activeSlot.hourLabel} · {activeSlot.periodLabel}
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className={`font-semibold ${activeMeta.textClass}`}>
              {activeMeta.label}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{activeSlot.recommendation}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 font-mono tabular-nums shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span>Est. AQI {activeSlot.estimatedAqi}</span>
        </div>
      </div>
    </div>
  );
}
