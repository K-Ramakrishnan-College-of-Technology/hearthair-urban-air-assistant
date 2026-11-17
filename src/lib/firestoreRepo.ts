import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { stripUndefined } from './sanitizers';
import type {
  AdvisorAnswerResult,
  AirQualityPlanResponse,
  HouseholdProfileInput,
  ImpactLogEntry,
  SavedAdvisorInteraction,
  SavedAirQualityPlan,
} from '../types/air';

function generateClientId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function loadHouseholdProfile(
  userId: string
): Promise<HouseholdProfileInput | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      city: String(data.city ?? 'Salt Lake City, UT'),
      neighborhoodType: data.neighborhoodType ?? 'valley_basin',
      householdSize: Number(data.householdSize ?? 3),
      hasChildrenOrSeniors: Boolean(data.hasChildrenOrSeniors ?? true),
      commuteMode: data.commuteMode ?? 'car_solo',
      heatingSource: data.heatingSource ?? 'gas_furnace',
      aqiLevel: 165,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveHouseholdProfile(
  userId: string,
  profile: HouseholdProfileInput
): Promise<void> {
  const path = `users/${userId}`;
  const docRef = doc(db, 'users', userId);
  try {
    const existingSnap = await getDoc(docRef);
    const baseFields = stripUndefined({
      city: profile.city.trim().slice(0, 100),
      neighborhoodType: profile.neighborhoodType,
      householdSize: Math.max(1, Math.min(20, Math.round(profile.householdSize))),
      hasChildrenOrSeniors: Boolean(profile.hasChildrenOrSeniors),
      commuteMode: profile.commuteMode,
      heatingSource: profile.heatingSource,
    });

    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ownerId: userId,
        ...baseFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ...baseFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAirQualityPlan(
  userId: string,
  plan: AirQualityPlanResponse
): Promise<string> {
  const planId = generateClientId('plan');
  const path = `users/${userId}/plans/${planId}`;
  try {
    const payload = stripUndefined({
      ownerId: userId,
      city: plan.city.trim().slice(0, 100),
      aqiLevel: Math.max(0, Math.min(500, Math.round(plan.aqiLevel))),
      commuteMode: String(plan.commuteMode).slice(0, 40),
      heatingSource: String(plan.heatingSource).slice(0, 40),
      summary: plan.summary.slice(0, 2000),
      dailyRoutines: plan.dailyRoutines.slice(0, 8),
      indoorHacks: plan.indoorHacks.slice(0, 8),
      alternatives: plan.alternatives.slice(0, 6),
      impactMetrics: {
        dailyPm25ExposureReductionPct: plan.impactMetrics.dailyPm25ExposureReductionPct,
        weeklyCo2SavedKg: plan.impactMetrics.weeklyCo2SavedKg,
        cleanAirHoursGainedPerDay: plan.impactMetrics.cleanAirHoursGainedPerDay,
        communityEquivalentNote: plan.impactMetrics.communityEquivalentNote.slice(0, 400),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', userId, 'plans', planId), payload);
    return planId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSavedPlan(userId: string, planId: string): Promise<void> {
  const path = `users/${userId}/plans/${planId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'plans', planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveAdvisorInteraction(
  userId: string,
  city: string,
  result: AdvisorAnswerResult
): Promise<string> {
  const interactionId = generateClientId('qa');
  const path = `users/${userId}/interactions/${interactionId}`;
  try {
    const payload = stripUndefined({
      ownerId: userId,
      city: city.trim().slice(0, 100),
      question: result.question.trim().slice(0, 1000),
      answer: result.answer.trim().slice(0, 4000),
      impactTakeaway: result.impactTakeaway.trim().slice(0, 600),
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', userId, 'interactions', interactionId), payload);
    return interactionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteAdvisorInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  const path = `users/${userId}/interactions/${interactionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'interactions', interactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createImpactLogEntry(
  userId: string,
  entry: {
    actionTitle: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    co2SavedGrams: number;
    pm25ExposureAvoidedPct: number;
  }
): Promise<string> {
  const logId = generateClientId('log');
  const path = `users/${userId}/impactLogs/${logId}`;
  try {
    const payload = stripUndefined({
      ownerId: userId,
      dateKey: getTodayDateKey(),
      actionTitle: entry.actionTitle.trim().slice(0, 160),
      category: entry.category,
      co2SavedGrams: Math.max(0, Math.min(500000, Number(entry.co2SavedGrams) || 0)),
      pm25ExposureAvoidedPct: Math.max(
        0,
        Math.min(100, Number(entry.pm25ExposureAvoidedPct) || 0)
      ),
      completed: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', userId, 'impactLogs', logId), payload);
    return logId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleImpactLogCompletion(
  userId: string,
  logId: string,
  completed: boolean
): Promise<void> {
  const path = `users/${userId}/impactLogs/${logId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'impactLogs', logId), {
      completed: Boolean(completed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteImpactLogEntry(userId: string, logId: string): Promise<void> {
  const path = `users/${userId}/impactLogs/${logId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'impactLogs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToSavedPlans(
  userId: string,
  onData: (plans: SavedAirQualityPlan[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/plans`;
  const q = query(
    collection(db, 'users', userId, 'plans'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedAirQualityPlan, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToInteractions(
  userId: string,
  onData: (items: SavedAdvisorInteraction[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/interactions`;
  const q = query(
    collection(db, 'users', userId, 'interactions'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(15)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedAdvisorInteraction, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToImpactLogs(
  userId: string,
  onData: (items: ImpactLogEntry[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/impactLogs`;
  const q = query(
    collection(db, 'users', userId, 'impactLogs'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ImpactLogEntry, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
