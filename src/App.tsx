import { CommunityImpactLab } from './components/CommunityImpactLab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeroConfigurator } from './components/HeroConfigurator';
import { ImpactLedger } from './components/ImpactLedger';
import { IndoorHacksAndAdvisor } from './components/IndoorHacksAndAdvisor';
import { RoutineAndAlternatives } from './components/RoutineAndAlternatives';
import { TopBar } from './components/TopBar';
import { useHearthAirWorkspace } from './hooks/useHearthAirWorkspace';

function HearthAirWorkspace() {
  const ws = useHearthAirWorkspace();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:bg-teal-800 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      <div className="sr-only" role="status" aria-live="polite">
        {ws.statusAnnouncement}
      </div>

      <TopBar
        user={ws.user}
        authBusy={ws.authBusy}
        onSignIn={ws.handleSignIn}
        onSignOut={ws.handleSignOut}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroConfigurator
          profile={ws.profile}
          plan={ws.activePlan}
          isDefaultStarter={ws.isDefaultStarter}
          generatingPlan={ws.generatingPlan}
          fetchingBrief={ws.fetchingBrief}
          localBrief={ws.localBrief}
          completedCountToday={ws.completedCountToday}
          aiError={ws.aiError}
          onChangeProfile={ws.setProfile}
          onGeneratePlan={ws.handleGeneratePlan}
          onFetchLocalBrief={ws.handleFetchLocalBrief}
        />

        <RoutineAndAlternatives
          plan={ws.activePlan}
          loggedTitlesToday={ws.loggedTitlesToday}
          savingActionKey={ws.savingActionKey}
          onLogAction={ws.handleLogAction}
        />

        <IndoorHacksAndAdvisor
          profile={ws.profile}
          plan={ws.activePlan}
          loggedTitlesToday={ws.loggedTitlesToday}
          savingActionKey={ws.savingActionKey}
          askingAdvisor={ws.askingAdvisor}
          advisorError={ws.advisorError}
          latestAnswer={ws.latestAnswer}
          questionInput={ws.questionInput}
          onChangeQuestionInput={ws.setQuestionInput}
          onAskAdvisor={ws.handleAskAdvisor}
          onLogAction={ws.handleLogAction}
        />

        <CommunityImpactLab
          profile={ws.profile}
          plan={ws.activePlan}
          generatingBrief={ws.generatingCommunityBrief}
          communityBrief={ws.communityBrief}
          briefError={ws.communityBriefError}
          onGenerateCommunityBrief={ws.handleGenerateCommunityBrief}
          onCommitSimulation={ws.handleLogAction}
          onAnnounce={ws.setStatusAnnouncement}
        />

        <ImpactLedger
          user={ws.user}
          impactLogs={ws.activeLogs}
          savedPlans={ws.savedPlans}
          savedInteractions={ws.savedInteractions}
          persistError={ws.persistError}
          hasPendingRetry={ws.hasPendingRetry}
          retryingSave={ws.retryingSave}
          onRetrySave={ws.handleRetrySave}
          onDismissError={ws.dismissPersistError}
          onSignIn={ws.handleSignIn}
          onToggleLog={ws.handleToggleLog}
          onDeleteLog={ws.handleDeleteLog}
          onLoadPlan={ws.handleLoadSavedPlan}
          onDeletePlan={ws.handleDeletePlan}
          onDeleteInteraction={ws.handleDeleteInteraction}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>HearthAir — Household Winter Smog & Urban Air Quality Guidance</p>
          <p>Informational environmental guidance only; consult a physician for respiratory symptoms.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HearthAirWorkspace />
    </ErrorBoundary>
  );
}
