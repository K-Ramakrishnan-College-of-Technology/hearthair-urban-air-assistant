import { useMemo, useState } from 'react';
import { Check, Copy, Download, Loader2, Users } from 'lucide-react';
import { calculateImpactSimulation } from '../lib/impactCalculator';
import type {
  AirQualityPlanResponse,
  CommunityBriefResult,
  HouseholdProfileInput,
  ImpactSimulationInputs,
} from '../types/air';

interface CommunityImpactLabProps {
  profile: HouseholdProfileInput;
  plan: AirQualityPlanResponse;
  generatingBrief: boolean;
  communityBrief: CommunityBriefResult | null;
  briefError: string | null;
  onGenerateCommunityBrief: (params: {
    focusArea: 'school_zone' | 'apartment_building' | 'neighborhood_block';
    participatingHouseholds: number;
    communityWeeklyCo2Kg: number;
    indoorPm25ReductionPct: number;
  }) => void;
  onCommitSimulation: (entry: {
    actionTitle: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    co2SavedGrams: number;
    pm25ExposureAvoidedPct: number;
  }) => void;
  onAnnounce: (msg: string) => void;
}

export function CommunityImpactLab({
  profile,
  plan,
  generatingBrief,
  communityBrief,
  briefError,
  onGenerateCommunityBrief,
  onCommitSimulation,
  onAnnounce,
}: CommunityImpactLabProps) {
  const [simInputs, setSimInputs] = useState<ImpactSimulationInputs>({
    transitOrCarpoolDaysPerWeek: 3,
    thermostatSetbackC: 1.5,
    indoorFiltrationHoursPerDay: 10,
    cleanCookingExhaust: true,
    participatingHouseholds: 15,
  });

  const [focusArea, setFocusArea] = useState<
    'school_zone' | 'apartment_building' | 'neighborhood_block'
  >('neighborhood_block');
  const [copied, setCopied] = useState(false);

  const simResult = useMemo(() => calculateImpactSimulation(simInputs), [simInputs]);

  async function handleCopyBulletin() {
    if (!communityBrief) return;
    const text = [
      communityBrief.title,
      '',
      communityBrief.bulletinText,
      '',
      ...communityBrief.actionBullets.map((b) => `- ${b}`),
      '',
      communityBrief.collectiveImpactSummary,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onAnnounce('Community air quality bulletin copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onAnnounce('Clipboard copy is unavailable in this browser context.');
    }
  }

  function handleDownloadSummary() {
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

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hearthair-${plan.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onAnnounce('Downloaded printable household air plan.');
  }

  return (
    <section id="community-lab" className="py-12 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              05. Community Smog Shield & Impact Simulator
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Model how small daily routine shifts scale from one household to an apartment building,
              school drop-off network, or city block during winter inversion alerts.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadSummary}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export Plan (.txt)</span>
          </button>
        </div>

        {/* Interactive Simulator Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Choice Controls */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="sim-transit" className="font-medium text-slate-700">
                    Transit / Carpool Days per Week
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {simInputs.transitOrCarpoolDaysPerWeek} days
                  </span>
                </div>
                <input
                  id="sim-transit"
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={simInputs.transitOrCarpoolDaysPerWeek}
                  aria-valuetext={`${simInputs.transitOrCarpoolDaysPerWeek} days per week`}
                  onChange={(e) =>
                    setSimInputs({
                      ...simInputs,
                      transitOrCarpoolDaysPerWeek: Number(e.target.value),
                    })
                  }
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="sim-setback" className="font-medium text-slate-700">
                    Winter Heating Setback
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    -{simInputs.thermostatSetbackC.toFixed(1)} °C
                  </span>
                </div>
                <input
                  id="sim-setback"
                  type="range"
                  min={0}
                  max={3}
                  step={0.5}
                  value={simInputs.thermostatSetbackC}
                  aria-valuetext={`${simInputs.thermostatSetbackC} degrees Celsius setback`}
                  onChange={(e) =>
                    setSimInputs({
                      ...simInputs,
                      thermostatSetbackC: Number(e.target.value),
                    })
                  }
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="sim-filtration" className="font-medium text-slate-700">
                    HEPA / DIY Box Fan Runtime
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {simInputs.indoorFiltrationHoursPerDay} hrs/day
                  </span>
                </div>
                <input
                  id="sim-filtration"
                  type="range"
                  min={0}
                  max={24}
                  step={2}
                  value={simInputs.indoorFiltrationHoursPerDay}
                  aria-valuetext={`${simInputs.indoorFiltrationHoursPerDay} hours per day`}
                  onChange={(e) =>
                    setSimInputs({
                      ...simInputs,
                      indoorFiltrationHoursPerDay: Number(e.target.value),
                    })
                  }
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="sim-households" className="font-medium text-slate-700">
                    Participating Households
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-teal-800">
                    {simInputs.participatingHouseholds} homes
                  </span>
                </div>
                <input
                  id="sim-households"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={simInputs.participatingHouseholds}
                  aria-valuetext={`${simInputs.participatingHouseholds} participating households`}
                  onChange={(e) =>
                    setSimInputs({
                      ...simInputs,
                      participatingHouseholds: Number(e.target.value),
                    })
                  }
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simInputs.cleanCookingExhaust}
                onChange={(e) =>
                  setSimInputs({
                    ...simInputs,
                    cleanCookingExhaust: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-teal-700 rounded"
              />
              <span className="text-xs font-medium text-slate-800">
                Use induction/electric kettle + vented range exhaust for all winter cooking
              </span>
            </label>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-600">
                Ready to commit this simulated configuration to your ledger?
              </span>
              <button
                type="button"
                onClick={() =>
                  onCommitSimulation({
                    actionTitle: `Winter Shield: ${simInputs.transitOrCarpoolDaysPerWeek}d transit, -${simInputs.thermostatSetbackC}C heat, ${simInputs.indoorFiltrationHoursPerDay}h filtration`,
                    category: 'sustainable_alt',
                    co2SavedGrams: Math.round((simResult.householdWeeklyCo2Kg * 1000) / 7),
                    pm25ExposureAvoidedPct: simResult.indoorPm25ReductionPct,
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Log Simulated Plan Today
              </button>
            </div>
          </div>

          {/* Right: Deterministic Impact Readout */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">Your Household / Week</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  -{simResult.householdWeeklyCo2Kg} kg
                </p>
                <p className="text-xs text-slate-500">CO2e avoided</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">90-Day Winter Season</p>
                <p className="mt-1 text-2xl font-bold text-teal-800 font-mono tabular-nums">
                  -{simResult.seasonal90DayCo2Kg} kg
                </p>
                <p className="text-xs text-slate-500">CO2e avoided</p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">Indoor PM2.5 Drop</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  -{simResult.indoorPm25ReductionPct}%
                </p>
                <p className="text-xs text-slate-500">Exposure reduction</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Clean Air Gained</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  +{simResult.cleanAirHoursGainedDaily} hrs
                </p>
                <p className="text-xs text-slate-500">Safer breathing / day</p>
              </div>
            </div>

            <div className="p-5 bg-white rounded-b-xl space-y-1.5">
              <p className="text-xs font-medium text-teal-800">
                Collective Block Impact · {simInputs.participatingHouseholds} Households
              </p>
              <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                -{simResult.communityWeeklyCo2Kg} kg CO2e / week
              </p>
              <p className="text-xs text-slate-600">
                Equivalent to removing{' '}
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {simResult.equivalentCarsOffRoadDaily}
                </span>{' '}
                cold-start commuter cars from local streets every winter day.
              </p>
            </div>
          </div>
        </div>

        {/* Shareable Community Action Notice Generator */}
        <div className="pt-6 border-t border-slate-200 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Neighborhood & School-Zone Action Bulletin
              </h3>
              <p className="text-xs text-slate-600">
                Generate a plain-language clean-air notice tailored to {profile.city} (AQI{' '}
                {profile.aqiLevel}) to share with neighbors, apartment boards, or parent groups.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <label htmlFor="community-focus" className="sr-only">
                Community Focus Setting
              </label>
              <select
                id="community-focus"
                value={focusArea}
                onChange={(e) =>
                  setFocusArea(
                    e.target.value as 'school_zone' | 'apartment_building' | 'neighborhood_block'
                  )
                }
                className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="neighborhood_block">Neighborhood Block</option>
                <option value="school_zone">School Zone & Drop-Off</option>
                <option value="apartment_building">Apartment Building</option>
              </select>

              <button
                type="button"
                disabled={generatingBrief}
                onClick={() =>
                  onGenerateCommunityBrief({
                    focusArea,
                    participatingHouseholds: simInputs.participatingHouseholds,
                    communityWeeklyCo2Kg: simResult.communityWeeklyCo2Kg,
                    indoorPm25ReductionPct: simResult.indoorPm25ReductionPct,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {generatingBrief ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>
                  {generatingBrief ? 'Drafting Bulletin...' : 'Generate Community Notice'}
                </span>
              </button>
            </div>
          </div>

          {briefError && (
            <div
              role="alert"
              className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              {briefError}
            </div>
          )}

          {communityBrief && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-teal-800">
                    Shareable Notice · {communityBrief.city}
                  </p>
                  <h4 className="text-base font-semibold text-slate-900">
                    {communityBrief.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBulletin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Notice</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                {communityBrief.bulletinText}
              </p>

              <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                {communityBrief.actionBullets.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>

              <p className="pt-3 border-t border-slate-200 text-xs font-medium text-slate-800">
                {communityBrief.collectiveImpactSummary}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
