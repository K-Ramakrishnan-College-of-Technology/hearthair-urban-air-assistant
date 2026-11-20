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
import {
  buildAdvisorInteractionPayload,
  buildAirQualityPlanPayload,
  buildHouseholdProfilePayload,
  buildImpactLogPayload,
  getTodayDateKey,
} from './firestorePayloads';
import type {
  AdvisorAnswerResult,
  AirQualityPlanResponse,
  HouseholdProfileInput,
  ImpactLogEntry,
  SavedAdvisorInteraction,
  SavedAirQualityPlan,
} from '../types/air';

export { getTodayDateKey };

function generateClientId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
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
    const baseFields = buildHouseholdProfilePayload(profile);

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
    const payload = buildAirQualityPlanPayload(userId, plan);
    await setDoc(doc(db, 'users', userId, 'plans', planId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
    const payload = buildAdvisorInteractionPayload(userId, city, result);
    await setDoc(doc(db, 'users', userId, 'interactions', interactionId), {
      ...payload,
      createdAt: serverTimestamp(),
    });
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
    const payload = buildImpactLogPayload(userId, entry);
    await setDoc(doc(db, 'users', userId, 'impactLogs', logId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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

function subscribeToUserSubcollection<T extends { id: string }>(
  userId: string,
  subcollection: 'plans' | 'interactions' | 'impactLogs',
  maxDocs: number,
  onData: (items: T[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/${subcollection}`;
  const q = query(
    collection(db, 'users', userId, subcollection),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxDocs)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<T, 'id'>),
      })) as T[];
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

export function subscribeToSavedPlans(
  userId: string,
  onData: (plans: SavedAirQualityPlan[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return subscribeToUserSubcollection<SavedAirQualityPlan>(
    userId,
    'plans',
    10,
    onData,
    onError
  );
}

export function subscribeToInteractions(
  userId: string,
  onData: (items: SavedAdvisorInteraction[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return subscribeToUserSubcollection<SavedAdvisorInteraction>(
    userId,
    'interactions',
    15,
    onData,
    onError
  );
}

export function subscribeToImpactLogs(
  userId: string,
  onData: (items: ImpactLogEntry[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return subscribeToUserSubcollection<ImpactLogEntry>(
    userId,
    'impactLogs',
    30,
    onData,
    onError
  );
}
