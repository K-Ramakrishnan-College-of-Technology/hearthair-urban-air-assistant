import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { AirQualityPlanResponse, RoutineStep, SustainableAlternative } from '../types/air';
import { ResilientImage } from './ResilientImage';

interface RoutineAndAlternativesProps {
  plan: AirQualityPlanResponse;
  loggedTitlesToday: Set<string>;
  savingActionKey: string | null;
  onLogAction: (entry: {
    actionTitle: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    co2SavedGrams: number;
    pm25ExposureAvoidedPct: number;
  }) => void;
}

type WindowFilter = 'all' | 'morning' | 'commute' | 'midday' | 'evening';

const WINDOW_LABELS: Record<WindowFilter, string> = {
  all: 'All Windows',
  morning: 'Morning',
  commute: 'Commute',
  midday: 'Midday',
  evening: 'Evening',
};

export function RoutineAndAlternatives({
  plan,
  loggedTitlesToday,
  savingActionKey,
  onLogAction,
}: RoutineAndAlternativesProps) {
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('all');

  const visibleRoutines: RoutineStep[] =
    windowFilter === 'all'
      ? plan.dailyRoutines
      : plan.dailyRoutines.filter((r) => r.timeWindow === windowFilter);

  return (
    <section id="routines" className="py-12 border-b border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Daily Routines Header & Filter */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                01. Low-Emission Daily Routines
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Timed to avoid winter inversion peaks ({plan.peakSmogWindow}) while reducing
                cold-start vehicle and heating emissions.
              </p>
            </div>

            <div
              role="group"
              aria-label="Filter routines by time window"
              className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto"
            >
              {(Object.keys(WINDOW_LABELS) as WindowFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWindowFilter(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    windowFilter === key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {WINDOW_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Routines List */}
          {visibleRoutines.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600 flex items-center justify-between">
              <span>No routine steps match this time window in the current plan.</span>
              <button
                type="button"
                onClick={() => setWindowFilter('all')}
                className="text-xs font-medium text-teal-800 hover:underline whitespace-nowrap"
              >
                Show all windows
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {visibleRoutines.map((routine) => {
                const isLogged = loggedTitlesToday.has(routine.title);
                const isSaving = savingActionKey === routine.title;
                return (
                  <div
                    key={routine.id}
                    className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
                  >
                    <div className="lg:col-span-8 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono tabular-nums font-medium text-slate-700">
                          {routine.clockRange}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{routine.timeWindow}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-teal-800">
                          -{routine.co2SavedGrams} g CO2e
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          -{routine.pm25ExposureAvoidedPct}% PM2.5 exposure
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">{routine.title}</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{routine.action}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-700">Direct impact: </span>
                        {routine.whyItMatters}
                      </p>
                    </div>

                    <div className="lg:col-span-4 flex lg:justify-end items-center">
                      <button
                        type="button"
                        disabled={isLogged || isSaving}
                        onClick={() =>
                          onLogAction({
                            actionTitle: routine.title,
                            category: 'routine',
                            co2SavedGrams: routine.co2SavedGrams,
                            pm25ExposureAvoidedPct: routine.pm25ExposureAvoidedPct,
                          })
                        }
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          isLogged
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60'
                        }`}
                      >
                        {isLogged ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Logged Today</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isSaving ? 'Saving...' : 'Log Action Today'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sustainable Lifestyle Alternatives */}
        <div className="pt-4 border-t border-slate-200 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-4">
              <div className="h-full min-h-[240px] rounded-xl overflow-hidden border border-slate-200 bg-white relative">
                <ResilientImage
                  src="/src/assets/images/low_emission_commute_1794924163286.jpg"
                  alt="Family walking beside a neighborhood electric tram and bike lane on a misty winter morning"
                  fallbackLabel="Low-Emission Urban Mobility"
                  className="w-full h-full object-cover lg:absolute lg:inset-0"
                />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  02. Sustainable Alternatives & Impact Swap Table
                </h2>
                <p className="text-sm text-slate-600">
                  {plan.impactMetrics.communityEquivalentNote}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-3 px-4">Area</th>
                      <th className="py-3 px-4">Current Habit</th>
                      <th className="py-3 px-4">Lower-Emission Alternative</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Weekly CO2e</th>
                      <th className="py-3 px-4 text-right">Track</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {plan.alternatives.map((alt: SustainableAlternative) => {
                      const actionTitle = `Adopt: ${alt.sustainableAlternative}`.slice(0, 160);
                      const isLogged = loggedTitlesToday.has(actionTitle);
                      const isSaving = savingActionKey === actionTitle;
                      return (
                        <tr key={alt.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap align-top">
                            {alt.category}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 align-top text-xs leading-relaxed">
                            {alt.currentHabit}
                          </td>
                          <td className="py-3.5 px-4 align-top space-y-1">
                            <p className="font-medium text-slate-900 text-xs leading-relaxed">
                              {alt.sustainableAlternative}
                            </p>
                            <p className="text-xs text-slate-500">{alt.householdBenefit}</p>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-teal-800 whitespace-nowrap align-top">
                            -{alt.weeklyCo2SavedKg.toFixed(1)} kg
                          </td>
                          <td className="py-3.5 px-4 text-right align-top">
                            <button
                              type="button"
                              disabled={isLogged || isSaving}
                              onClick={() =>
                                onLogAction({
                                  actionTitle,
                                  category: 'sustainable_alt',
                                  co2SavedGrams: Math.round((alt.weeklyCo2SavedKg * 1000) / 7),
                                  pm25ExposureAvoidedPct: 18,
                                })
                              }
                              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                                isLogged
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isLogged ? 'Active' : isSaving ? 'Saving...' : 'Commit Swap'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
