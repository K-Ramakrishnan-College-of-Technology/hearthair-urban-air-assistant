import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { DEFAULT_PROFILE, STARTER_PLAN } from '../data/defaultPlan';
import { auth, googleProvider } from '../lib/firebase';
import {
  createImpactLogEntry,
  deleteAdvisorInteraction,
  deleteImpactLogEntry,
  deleteSavedPlan,
  getTodayDateKey,
  loadHouseholdProfile,
  saveAdvisorInteraction,
  saveAirQualityPlan,
  saveHouseholdProfile,
  subscribeToImpactLogs,
  subscribeToInteractions,
  subscribeToSavedPlans,
  toggleImpactLogCompletion,
} from '../lib/firestoreRepo';
import type {
  AdvisorAnswerResult,
  AirQualityPlanResponse,
  CommunityBriefResult,
  HouseholdProfileInput,
  ImpactLogEntry,
  LocalBriefResult,
  SavedAdvisorInteraction,
  SavedAirQualityPlan,
} from '../types/air';

type PendingRetryAction =
  | { type: 'plan'; profile: HouseholdProfileInput; plan: AirQualityPlanResponse }
  | { type: 'interaction'; city: string; result: AdvisorAnswerResult }
  | {
      type: 'log';
      entry: {
        actionTitle: string;
        category: 'routine' | 'indoor_hack' | 'sustainable_alt';
        co2SavedGrams: number;
        pm25ExposureAvoidedPct: number;
      };
    };

export function useHearthAirWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const [profile, setProfile] = useState<HouseholdProfileInput>(DEFAULT_PROFILE);
  const [activePlan, setActivePlan] = useState<AirQualityPlanResponse>(STARTER_PLAN);
  const [isDefaultStarter, setIsDefaultStarter] = useState(true);

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [fetchingBrief, setFetchingBrief] = useState(false);
  const [localBrief, setLocalBrief] = useState<LocalBriefResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [questionInput, setQuestionInput] = useState('');
  const [askingAdvisor, setAskingAdvisor] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [latestAnswer, setLatestAnswer] = useState<AdvisorAnswerResult | null>(null);

  const [savedPlans, setSavedPlans] = useState<SavedAirQualityPlan[]>([]);
  const [savedInteractions, setSavedInteractions] = useState<SavedAdvisorInteraction[]>([]);
  const [cloudLogs, setCloudLogs] = useState<ImpactLogEntry[]>([]);
  const [localLogs, setLocalLogs] = useState<ImpactLogEntry[]>([]);

  const [savingActionKey, setSavingActionKey] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<PendingRetryAction | null>(null);
  const [retryingSave, setRetryingSave] = useState(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const [generatingCommunityBrief, setGeneratingCommunityBrief] = useState(false);
  const [communityBrief, setCommunityBrief] = useState<CommunityBriefResult | null>(null);
  const [communityBriefError, setCommunityBriefError] = useState<string | null>(null);
  const communityAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      communityAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setSavedPlans([]);
      setSavedInteractions([]);
      setCloudLogs([]);
      return;
    }

    let cancelled = false;
    void loadHouseholdProfile(user.uid)
      .then((loaded) => {
        if (!cancelled && loaded) {
          setProfile((prev) => ({ ...prev, ...loaded }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPersistError(
            err instanceof Error ? err.message : 'Unable to load saved household profile.'
          );
        }
      });

    const unsubPlans = subscribeToSavedPlans(
      user.uid,
      (plans) => setSavedPlans(plans),
      (err) => setPersistError(err.message)
    );
    const unsubInteractions = subscribeToInteractions(
      user.uid,
      (items) => setSavedInteractions(items),
      (err) => setPersistError(err.message)
    );
    const unsubLogs = subscribeToImpactLogs(
      user.uid,
      (items) => setCloudLogs(items),
      (err) => setPersistError(err.message)
    );

    return () => {
      cancelled = true;
      unsubPlans();
      unsubInteractions();
      unsubLogs();
    };
  }, [authReady, user]);

  const activeLogs = user ? cloudLogs : localLogs;
  const todayKey = getTodayDateKey();

  const loggedTitlesToday = useMemo(() => {
    const set = new Set<string>();
    for (const item of activeLogs) {
      if (item.dateKey === todayKey && item.completed) {
        set.add(item.actionTitle);
      }
    }
    return set;
  }, [activeLogs, todayKey]);

  const completedCountToday = useMemo(
    () => activeLogs.filter((item) => item.dateKey === todayKey && item.completed).length,
    [activeLogs, todayKey]
  );

  async function handleSignIn() {
    setAuthBusy(true);
    setPersistError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in could not complete.';
      setPersistError(msg);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAuthBusy(false);
    }
  }

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      try {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      } catch {
        // Proceed without token header if token refresh is unavailable
      }
    }
    return headers;
  }

  async function persistPlanToFirestore(
    uid: string,
    prof: HouseholdProfileInput,
    plan: AirQualityPlanResponse
  ) {
    await saveHouseholdProfile(uid, prof);
    await saveAirQualityPlan(uid, plan);
  }

  async function handleGeneratePlan() {
    setGeneratingPlan(true);
    setAiError(null);
    setPersistError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/air-assistant/plan', {
        method: 'POST',
        headers,
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok || !data.plan) {
        throw new Error(data.error || 'Could not generate tailored air quality plan.');
      }

      const generatedPlan = data.plan as AirQualityPlanResponse;
      setActivePlan(generatedPlan);
      setIsDefaultStarter(false);
      setStatusAnnouncement(`Tailored winter air plan generated for ${generatedPlan.city}.`);

      if (user) {
        try {
          await persistPlanToFirestore(user.uid, profile, generatedPlan);
          setPendingRetry(null);
        } catch (saveErr) {
          setPendingRetry({ type: 'plan', profile, plan: generatedPlan });
          setPersistError(
            saveErr instanceof Error
              ? `Plan generated, but saving to your account failed: ${saveErr.message}`
              : 'Plan generated, but saving to your account failed.'
          );
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate tailored plan.');
    } finally {
      setGeneratingPlan(false);
    }
  }

  async function handleFetchLocalBrief() {
    setFetchingBrief(true);
    setAiError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/air-assistant/local-brief', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          city: profile.city,
          neighborhoodType: profile.neighborhoodType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.brief) {
        throw new Error(data.error || 'Could not fetch local winter smog briefing.');
      }
      setLocalBrief(data.brief as LocalBriefResult);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to check local conditions.');
    } finally {
      setFetchingBrief(false);
    }
  }

  async function handleAskAdvisor(question: string) {
    setAskingAdvisor(true);
    setAdvisorError(null);
    setPersistError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/air-assistant/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          city: profile.city,
          aqiLevel: profile.aqiLevel,
          hasChildrenOrSeniors: profile.hasChildrenOrSeniors,
          heatingSource: profile.heatingSource,
          question,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.result) {
        throw new Error(data.error || 'Could not retrieve advice right now.');
      }

      const answerResult = data.result as AdvisorAnswerResult;
      setLatestAnswer(answerResult);

      if (user) {
        try {
          await saveAdvisorInteraction(user.uid, profile.city, answerResult);
          setPendingRetry(null);
          setQuestionInput('');
        } catch (saveErr) {
          setPendingRetry({
            type: 'interaction',
            city: profile.city,
            result: answerResult,
          });
          setPersistError(
            saveErr instanceof Error
              ? `Response ready, but could not save to Firestore: ${saveErr.message}`
              : 'Response ready, but saving failed.'
          );
        }
      } else {
        setQuestionInput('');
      }
    } catch (err) {
      setAdvisorError(err instanceof Error ? err.message : 'Advisor request failed.');
    } finally {
      setAskingAdvisor(false);
    }
  }

  async function handleGenerateCommunityBrief(params: {
    focusArea: 'school_zone' | 'apartment_building' | 'neighborhood_block';
    participatingHouseholds: number;
    communityWeeklyCo2Kg: number;
    indoorPm25ReductionPct: number;
  }) {
    communityAbortRef.current?.abort();
    const controller = new AbortController();
    communityAbortRef.current = controller;

    setGeneratingCommunityBrief(true);
    setCommunityBriefError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/air-assistant/community-brief', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          city: profile.city,
          aqiLevel: profile.aqiLevel,
          ...params,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.communityBrief) {
        throw new Error(data.error || 'Could not generate neighborhood bulletin.');
      }
      setCommunityBrief(data.communityBrief as CommunityBriefResult);
      setStatusAnnouncement(`Community winter air bulletin ready for ${profile.city}.`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setCommunityBriefError(
        err instanceof Error ? err.message : 'Unable to draft community notice.'
      );
    } finally {
      setGeneratingCommunityBrief(false);
    }
  }

  async function handleLogAction(entry: {
    actionTitle: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    co2SavedGrams: number;
    pm25ExposureAvoidedPct: number;
  }) {
    setSavingActionKey(entry.actionTitle);
    setPersistError(null);

    if (!user) {
      const localEntry: ImpactLogEntry = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ownerId: 'local_session',
        dateKey: getTodayDateKey(),
        actionTitle: entry.actionTitle,
        category: entry.category,
        co2SavedGrams: entry.co2SavedGrams,
        pm25ExposureAvoidedPct: entry.pm25ExposureAvoidedPct,
        completed: true,
      };
      setLocalLogs((prev) => [localEntry, ...prev]);
      setSavingActionKey(null);
      return;
    }

    try {
      await createImpactLogEntry(user.uid, entry);
      setPendingRetry(null);
    } catch (err) {
      setPendingRetry({ type: 'log', entry });
      setPersistError(
        err instanceof Error ? `Failed to log action: ${err.message}` : 'Failed to log action.'
      );
    } finally {
      setSavingActionKey(null);
    }
  }

  async function handleRetrySave() {
    if (!user || !pendingRetry) {
      return;
    }
    setRetryingSave(true);
    setPersistError(null);
    try {
      if (pendingRetry.type === 'plan') {
        await persistPlanToFirestore(user.uid, pendingRetry.profile, pendingRetry.plan);
      } else if (pendingRetry.type === 'interaction') {
        await saveAdvisorInteraction(user.uid, pendingRetry.city, pendingRetry.result);
        setQuestionInput('');
      } else if (pendingRetry.type === 'log') {
        await createImpactLogEntry(user.uid, pendingRetry.entry);
      }
      setPendingRetry(null);
    } catch (err) {
      setPersistError(
        err instanceof Error ? `Retry failed: ${err.message}` : 'Retry failed.'
      );
    } finally {
      setRetryingSave(false);
    }
  }

  async function handleToggleLog(logId: string, nextCompleted: boolean) {
    if (!user) {
      setLocalLogs((prev) =>
        prev.map((item) => (item.id === logId ? { ...item, completed: nextCompleted } : item))
      );
      return;
    }
    try {
      await toggleImpactLogCompletion(user.uid, logId, nextCompleted);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Unable to update log entry.');
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!user) {
      setLocalLogs((prev) => prev.filter((item) => item.id !== logId));
      return;
    }
    try {
      await deleteImpactLogEntry(user.uid, logId);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Unable to delete log entry.');
    }
  }

  function handleLoadSavedPlan(saved: SavedAirQualityPlan) {
    setActivePlan(saved);
    setIsDefaultStarter(false);
    setProfile((prev) => ({
      ...prev,
      city: saved.city,
      aqiLevel: saved.aqiLevel,
      commuteMode: saved.commuteMode,
      heatingSource: saved.heatingSource,
    }));
    document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleDeletePlan(planId: string) {
    if (!user) return;
    try {
      await deleteSavedPlan(user.uid, planId);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Unable to delete saved plan.');
    }
  }

  async function handleDeleteInteraction(interactionId: string) {
    if (!user) return;
    try {
      await deleteAdvisorInteraction(user.uid, interactionId);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Unable to delete Q&A note.');
    }
  }

  return {
    user,
    authBusy,
    profile,
    setProfile,
    activePlan,
    isDefaultStarter,
    generatingPlan,
    fetchingBrief,
    localBrief,
    aiError,
    questionInput,
    setQuestionInput,
    askingAdvisor,
    advisorError,
    latestAnswer,
    savedPlans,
    savedInteractions,
    activeLogs,
    loggedTitlesToday,
    completedCountToday,
    savingActionKey,
    persistError,
    hasPendingRetry: pendingRetry !== null,
    retryingSave,
    statusAnnouncement,
    setStatusAnnouncement,
    generatingCommunityBrief,
    communityBrief,
    communityBriefError,
    dismissPersistError: () => setPersistError(null),
    handleSignIn,
    handleSignOut,
    handleGeneratePlan,
    handleFetchLocalBrief,
    handleAskAdvisor,
    handleGenerateCommunityBrief,
    handleLogAction,
    handleRetrySave,
    handleToggleLog,
    handleDeleteLog,
    handleLoadSavedPlan,
    handleDeletePlan,
    handleDeleteInteraction,
  };
}
