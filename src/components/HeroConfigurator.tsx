import { Globe, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { getAqiSeverity } from '../lib/sanitizers';
import type {
  AirQualityPlanResponse,
  CommuteMode,
  HeatingSource,
  HouseholdProfileInput,
  LocalBriefResult,
  NeighborhoodType,
} from '../types/air';
import { ResilientImage } from './ResilientImage';
import { VentilationTimeline } from './VentilationTimeline';

interface HeroConfiguratorProps {
  profile: HouseholdProfileInput;
  plan: AirQualityPlanResponse;
  isDefaultStarter: boolean;
  generatingPlan: boolean;
  fetchingBrief: boolean;
  localBrief: LocalBriefResult | null;
  completedCountToday: number;
  aiError: string | null;
  onChangeProfile: (next: HouseholdProfileInput) => void;
  onGeneratePlan: () => void;
  onFetchLocalBrief: () => void;
}

export function HeroConfigurator({
  profile,
  plan,
  isDefaultStarter,
  generatingPlan,
  fetchingBrief,
  localBrief,
  completedCountToday,
  aiError,
  onChangeProfile,
  onGeneratePlan,
  onFetchLocalBrief,
}: HeroConfiguratorProps) {
  const aqiSeverity = getAqiSeverity(profile.aqiLevel);

  return (
    <section id="overview" className="pt-8 pb-12 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Editorial Headline + Tailoring Form */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium text-teal-800">
                Winter Smog & Urban Household Assistant
                <span aria-hidden="true"> · </span>
                {isDefaultStarter ? 'Starter Baseline' : 'Tailored to Your Home'}
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Breathe cleaner through winter smog and temperature inversions.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                Tailor daily low-emission routines, practical indoor air quality hacks, and
                sustainable household swaps to your neighborhood conditions—with clear PM2.5 and
                CO2e impact numbers for every choice.
              </p>
            </div>

            {/* Configuration Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onGeneratePlan();
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="city-input"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    City or Urban District
                  </label>
                  <input
                    id="city-input"
                    type="text"
                    required
                    maxLength={100}
                    value={profile.city}
                    onChange={(e) => onChangeProfile({ ...profile, city: e.target.value })}
                    placeholder="e.g., Salt Lake City, Lahore, Milan, Denver"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="topography-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Neighborhood Setting
                  </label>
                  <select
                    id="topography-select"
                    value={profile.neighborhoodType}
                    onChange={(e) =>
                      onChangeProfile({
                        ...profile,
                        neighborhoodType: e.target.value as NeighborhoodType,
                      })
                    }
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="valley_basin">Valley / Basin (Inversion Prone)</option>
                    <option value="dense_urban">Dense Urban Street Canyon</option>
                    <option value="suburban_arterial">Suburban Near Arterial Road</option>
                    <option value="industrial_corridor">Industrial / Freight Corridor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="commute-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Primary Commute
                  </label>
                  <select
                    id="commute-select"
                    value={profile.commuteMode}
                    onChange={(e) =>
                      onChangeProfile({
                        ...profile,
                        commuteMode: e.target.value as CommuteMode,
                      })
                    }
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="car_solo">Solo Gas / Hybrid Car</option>
                    <option value="carpool">Shared Carpool</option>
                    <option value="public_transit">Bus / Rail Transit</option>
                    <option value="walk_cycle">Walk / Cycle</option>
                    <option value="remote_hybrid">Remote / Hybrid</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="heating-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Winter Heating
                  </label>
                  <select
                    id="heating-select"
                    value={profile.heatingSource}
                    onChange={(e) =>
                      onChangeProfile({
                        ...profile,
                        heatingSource: e.target.value as HeatingSource,
                      })
                    }
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="gas_furnace">Natural Gas Furnace</option>
                    <option value="electric_heat_pump">Electric Heat Pump</option>
                    <option value="wood_pellet_stove">Wood / Pellet Stove</option>
                    <option value="district_heating">District Heating</option>
                    <option value="radiator_boiler">Radiator / Oil Boiler</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="household-size"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Household Size
                  </label>
                  <input
                    id="household-size"
                    type="number"
                    min={1}
                    max={20}
                    value={profile.householdSize}
                    onChange={(e) =>
                      onChangeProfile({
                        ...profile,
                        householdSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              {/* AQI Slider + Sensitive Members Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label htmlFor="aqi-slider" className="font-medium text-slate-700">
                      Current / Target Outdoor AQI
                    </label>
                    <span className={`font-mono font-semibold tabular-nums ${aqiSeverity.textClass}`}>
                      {profile.aqiLevel} · {aqiSeverity.label}
                    </span>
                  </div>
                  <input
                    id="aqi-slider"
                    type="range"
                    min={20}
                    max={400}
                    step={5}
                    value={profile.aqiLevel}
                    aria-valuetext={`AQI ${profile.aqiLevel}, ${aqiSeverity.label}`}
                    onChange={(e) =>
                      onChangeProfile({ ...profile, aqiLevel: Number(e.target.value) })
                    }
                    className="w-full accent-teal-700 cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={profile.hasChildrenOrSeniors}
                    onChange={(e) =>
                      onChangeProfile({
                        ...profile,
                        hasChildrenOrSeniors: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Children, elders, or asthma-sensitive family members
                  </span>
                </label>
              </div>

              <div>
                <label
                  htmlFor="notes-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Home & Schedule Notes (optional)
                </label>
                <input
                  id="notes-input"
                  type="text"
                  maxLength={400}
                  value={profile.notes ?? ''}
                  onChange={(e) => onChangeProfile({ ...profile, notes: e.target.value })}
                  placeholder="e.g., 3rd-floor apartment, stroller walks at 4 PM, gas stove..."
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {aiError && (
                <div
                  role="alert"
                  className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
                >
                  {aiError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={generatingPlan}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {generatingPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{generatingPlan ? 'Tailoring Plan...' : 'Generate Tailored Plan'}</span>
                </button>

                <button
                  type="button"
                  onClick={onFetchLocalBrief}
                  disabled={fetchingBrief}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:opacity-60"
                >
                  {fetchingBrief ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Globe className="w-4 h-4 text-teal-700" aria-hidden="true" />
                  )}
                  <span>{fetchingBrief ? 'Checking Conditions...' : 'Check Local Smog Brief'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Editorial Home Air Image with Situational Summary Scrim */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative flex-1 min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <ResilientImage
                src="/src/assets/images/hero_winter_air_1794924162669.jpg"
                alt="Modern family living room in winter with HEPA air purifier and indoor plants overlooking an urban skyline in winter mist"
                fallbackLabel="Protected Indoor Winter Sanctuary"
                className="w-full h-full object-cover lg:absolute lg:inset-0"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent p-5 text-white space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-200">
                  <span className="font-medium truncate">{plan.city}</span>
                  <span className="font-mono tabular-nums shrink-0">
                    AQI {plan.aqiLevel} · {aqiSeverity.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-100 line-clamp-3">
                  {plan.summary}
                </p>
                <p className="text-xs text-slate-300 font-mono tabular-nums">
                  Peak smog window: {plan.peakSmogWindow}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Impact Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-slate-50 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Daily PM2.5 Exposure Avoided</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              -{plan.impactMetrics.dailyPm25ExposureReductionPct}%
            </p>
            <p className="mt-1 text-xs text-slate-500">Indoor + commute combined</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Weekly CO2e Reduced</p>
            <p className="mt-1.5 text-2xl font-bold text-teal-800 font-mono tabular-nums">
              {plan.impactMetrics.weeklyCo2SavedKg.toFixed(1)} kg
            </p>
            <p className="mt-1 text-xs text-slate-500">From transit & heating shifts</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Clean Air Hours Gained</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              +{plan.impactMetrics.cleanAirHoursGainedPerDay.toFixed(1)} hrs/day
            </p>
            <p className="mt-1 text-xs text-slate-500">Inside safe indoor thresholds</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-600">Actions Logged Today</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {completedCountToday}
            </p>
            <p className="mt-1 text-xs text-slate-500">Tracked in your family ledger</p>
          </div>
        </div>

        {/* 24-Hour Inversion & Safe Ventilation Window Forecaster */}
        <VentilationTimeline profile={profile} />

        {/* Grounded Local Winter Smog Brief (if requested) */}
        {localBrief && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {localBrief.advisoryHeadline}
              </h2>
              <span className="text-xs text-slate-500">Web-grounded regional brief</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {localBrief.briefText}
            </p>
            {localBrief.groundingSources.length > 0 && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <span className="font-medium text-slate-600">Sources:</span>
                {localBrief.groundingSources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-800 hover:underline"
                  >
                    <span className="max-w-[220px] truncate">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
