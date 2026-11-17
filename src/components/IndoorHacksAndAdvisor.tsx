import { useState } from 'react';
import { Check, Loader2, Plus, Send } from 'lucide-react';
import type {
  AdvisorAnswerResult,
  AirQualityPlanResponse,
  HouseholdProfileInput,
  IndoorHack,
} from '../types/air';
import { ResilientImage } from './ResilientImage';

interface IndoorHacksAndAdvisorProps {
  profile: HouseholdProfileInput;
  plan: AirQualityPlanResponse;
  loggedTitlesToday: Set<string>;
  savingActionKey: string | null;
  askingAdvisor: boolean;
  advisorError: string | null;
  latestAnswer: AdvisorAnswerResult | null;
  questionInput: string;
  onChangeQuestionInput: (q: string) => void;
  onAskAdvisor: (question: string) => void;
  onLogAction: (entry: {
    actionTitle: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    co2SavedGrams: number;
    pm25ExposureAvoidedPct: number;
  }) => void;
}

type CostFilter = 'all' | 'Free' | 'Low-Cost' | 'Moderate';

const QUICK_QUESTIONS = [
  'Is it safe to crack bedroom windows for 10 minutes at 2 PM when AQI is above 150?',
  'How can we keep indoor air safe while cooking on a gas stove in winter?',
  'What is the fastest DIY indoor filter setup for a child’s bedroom under $75?',
];

export function IndoorHacksAndAdvisor({
  profile,
  plan,
  loggedTitlesToday,
  savingActionKey,
  askingAdvisor,
  advisorError,
  latestAnswer,
  questionInput,
  onChangeQuestionInput,
  onAskAdvisor,
  onLogAction,
}: IndoorHacksAndAdvisorProps) {
  const [costFilter, setCostFilter] = useState<CostFilter>('all');

  const visibleHacks: IndoorHack[] =
    costFilter === 'all'
      ? plan.indoorHacks
      : plan.indoorHacks.filter((h) => h.costTier === costFilter);

  return (
    <section id="indoor-hacks" className="py-12 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Indoor Air Quality Hacks */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                03. Indoor Air Quality Hacks
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Practical filtration, ventilation timing, and source-control steps calibrated for
                sealed winter homes.
              </p>
            </div>

            <div
              role="group"
              aria-label="Filter indoor hacks by cost"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
            >
              {(['all', 'Free', 'Low-Cost', 'Moderate'] as CostFilter[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setCostFilter(tier)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    costFilter === tier
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tier === 'all' ? 'All Budgets' : tier}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Editorial DIY Setup Photo */}
            <div className="lg:col-span-4 space-y-3">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <ResilientImage
                  src="/src/assets/images/indoor_air_setup_1794924162752.jpg"
                  alt="DIY Corsi-Rosenthal MERV-13 box air purifier and digital PM2.5 monitor beside a sealed winter window"
                  fallbackLabel="DIY MERV-13 Filtration & Sealing"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                A 4-filter MERV-13 Corsi-Rosenthal box delivers high Clean Air Delivery Rate (CADR)
                at roughly one-third the cost of commercial HEPA units during multi-day winter smog
                episodes.
              </p>
            </div>

            {/* Hack Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleHacks.length === 0 ? (
                <div className="md:col-span-2 p-6 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center justify-between">
                  <span>No indoor hacks in this budget tier for the active plan.</span>
                  <button
                    type="button"
                    onClick={() => setCostFilter('all')}
                    className="text-xs font-medium text-teal-800 hover:underline"
                  >
                    View all tiers
                  </button>
                </div>
              ) : (
                visibleHacks.map((hack) => {
                  const isLogged = loggedTitlesToday.has(hack.title);
                  const isSaving = savingActionKey === hack.title;
                  return (
                    <div
                      key={hack.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-medium text-teal-800">{hack.costTier}</span>
                          <span className="truncate">{hack.cadrOrEfficiencyGain}</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">{hack.title}</h3>
                        <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
                          {hack.setupSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        <p className="text-xs text-slate-600">{hack.pm25ReductionNote}</p>
                        <button
                          type="button"
                          disabled={isLogged || isSaving}
                          onClick={() =>
                            onLogAction({
                              actionTitle: hack.title,
                              category: 'indoor_hack',
                              co2SavedGrams: 150,
                              pm25ExposureAvoidedPct: 35,
                            })
                          }
                          className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                            isLogged
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {isLogged ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Adopted Today</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{isSaving ? 'Saving...' : 'Log Hack Adopted'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Interactive Family Air Quality Q&A Advisor */}
        <div className="pt-8 border-t border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                04. Ask the Family Air Advisor
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ask specific questions tailored to {profile.city} (AQI {profile.aqiLevel},{' '}
                {profile.heatingSource.replace(/_/g, ' ')}). Questions and answers are saved to
                your ledger when signed in.
              </p>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Quick situational questions:</p>
                <div className="space-y-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onChangeQuestionInput(q)}
                      className="w-full text-left p-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (questionInput.trim().length >= 4) {
                    onAskAdvisor(questionInput.trim());
                  }
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <label
                  htmlFor="advisor-question"
                  className="block text-xs font-medium text-slate-700"
                >
                  Your household air quality or emission question
                </label>
                <textarea
                  id="advisor-question"
                  rows={3}
                  maxLength={800}
                  required
                  value={questionInput}
                  onChange={(e) => onChangeQuestionInput(e.target.value)}
                  placeholder="e.g., Should we run our bathroom exhaust fan while sealing windows against winter smog?"
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />

                {advisorError && (
                  <div
                    role="alert"
                    className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
                  >
                    {advisorError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {questionInput.length}/800
                  </span>
                  <button
                    type="submit"
                    disabled={askingAdvisor || questionInput.trim().length < 4}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {askingAdvisor ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{askingAdvisor ? 'Analyzing...' : 'Ask Air Advisor'}</span>
                  </button>
                </div>
              </form>

              {latestAnswer && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-teal-800">Advisor Guidance</p>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {latestAnswer.question}
                    </h3>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {latestAnswer.answer}
                  </p>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-slate-900">Direct Impact</p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {latestAnswer.impactTakeaway}
                    </p>
                  </div>

                  {latestAnswer.actionableChecklist.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-800">Immediate steps:</p>
                      <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                        {latestAnswer.actionableChecklist.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
