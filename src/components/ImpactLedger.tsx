import type { User } from 'firebase/auth';
import { CheckCircle2, Circle, LogIn, RotateCcw, Trash2 } from 'lucide-react';
import type {
  ImpactLogEntry,
  SavedAdvisorInteraction,
  SavedAirQualityPlan,
} from '../types/air';

interface ImpactLedgerProps {
  user: User | null;
  impactLogs: ImpactLogEntry[];
  savedPlans: SavedAirQualityPlan[];
  savedInteractions: SavedAdvisorInteraction[];
  persistError: string | null;
  hasPendingRetry: boolean;
  retryingSave: boolean;
  onRetrySave: () => void;
  onDismissError: () => void;
  onSignIn: () => void;
  onToggleLog: (logId: string, nextCompleted: boolean) => void;
  onDeleteLog: (logId: string) => void;
  onLoadPlan: (plan: SavedAirQualityPlan) => void;
  onDeletePlan: (planId: string) => void;
  onDeleteInteraction: (interactionId: string) => void;
}

export function ImpactLedger({
  user,
  impactLogs,
  savedPlans,
  savedInteractions,
  persistError,
  hasPendingRetry,
  retryingSave,
  onRetrySave,
  onDismissError,
  onSignIn,
  onToggleLog,
  onDeleteLog,
  onLoadPlan,
  onDeletePlan,
  onDeleteInteraction,
}: ImpactLedgerProps) {
  const completedLogs = impactLogs.filter((l) => l.completed);
  const totalCo2Kg = completedLogs.reduce((sum, l) => sum + (l.co2SavedGrams || 0), 0) / 1000;

  return (
    <section id="impact-ledger" className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              05. Family Impact Ledger & Saved Plans
            </h2>
            <p className="text-sm text-slate-600">
              {user
                ? 'Synced privately to your household account. Track completed habits and revisit saved city plans.'
                : 'Showing your current browser session. Sign in with Google to save plans, Q&A guidance, and daily impact across sessions.'}
            </p>
          </div>

          {!user && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign in to Sync Ledger</span>
            </button>
          )}
        </div>

        {/* Persistence Error Banner with Explicit Retry Save */}
        {persistError && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-red-900">Could not complete save</p>
              <p className="text-xs text-red-800">{persistError}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasPendingRetry && (
                <button
                  type="button"
                  onClick={onRetrySave}
                  disabled={retryingSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{retryingSave ? 'Retrying...' : 'Retry Save'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onDismissError}
                className="px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Logged Daily Actions */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-slate-900">Logged Household Actions</h3>
              <div className="text-xs text-slate-600 font-mono tabular-nums">
                {completedLogs.length} completed · {totalCo2Kg.toFixed(2)} kg CO2e saved
              </div>
            </div>

            {impactLogs.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">
                No actions logged yet. Click <span className="font-medium text-slate-900">Log Action Today</span> on any routine or indoor hack above to record your family’s measurable impact.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {impactLogs.map((entry) => (
                  <li
                    key={entry.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleLog(entry.id, !entry.completed)}
                      className="flex items-start gap-3 text-left min-w-0 flex-1"
                    >
                      {entry.completed ? (
                        <CheckCircle2
                          className="w-4 h-4 text-teal-700 mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            entry.completed ? 'text-slate-900' : 'text-slate-500 line-through'
                          }`}
                        >
                          {entry.actionTitle}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          {entry.dateKey} · -{entry.co2SavedGrams} g CO2e · -
                          {entry.pm25ExposureAvoidedPct}% PM2.5
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteLog(entry.id)}
                      aria-label={`Remove ${entry.actionTitle}`}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-md transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Saved Plans & Saved Q&A */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Saved City Plans</h3>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {savedPlans.length} saved
                </span>
              </div>

              {savedPlans.length === 0 ? (
                <div className="p-5 text-xs text-slate-600 leading-relaxed">
                  {user
                    ? 'Generate a tailored plan above to automatically save it here for quick switching.'
                    : 'Sign in with Google and generate a plan to keep tailored winter smog plans saved across devices.'}
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {savedPlans.map((p) => (
                    <li
                      key={p.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.city}</p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          AQI {p.aqiLevel} · -{p.impactMetrics.dailyPm25ExposureReductionPct}% PM2.5
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onLoadPlan(p)}
                          className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePlan(p.id)}
                          aria-label={`Delete plan for ${p.city}`}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Saved Advisor Q&A</h3>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {savedInteractions.length} notes
                </span>
              </div>

              {savedInteractions.length === 0 ? (
                <div className="p-5 text-xs text-slate-600 leading-relaxed">
                  Questions asked in the Family Air Advisor appear here once saved.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {savedInteractions.map((item) => (
                    <li key={item.id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">{item.question}</p>
                        <button
                          type="button"
                          onClick={() => onDeleteInteraction(item.id)}
                          aria-label="Delete saved Q&A note"
                          className="p-1 text-slate-400 hover:text-red-700 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.impactTakeaway}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
