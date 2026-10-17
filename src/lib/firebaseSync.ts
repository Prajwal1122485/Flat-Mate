import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db, getFirebaseDb, isFirebaseConfigured, firebaseConfig } from './firebase';
import { AppState, saveAppState, loadAppState, getInitialAppState } from './storage';

const DOC_ID = 'flat_ledger_state';
const COLLECTION_NAME = 'flats';

export type FirebaseSyncStatus = 'connected' | 'connecting' | 'error' | 'unconfigured';

let currentStatus: FirebaseSyncStatus = 'connecting';
let lastErrorMessage: string | null = null;

export function getFirebaseSyncStatus(): { status: FirebaseSyncStatus; error: string | null } {
  return {
    status: isFirebaseConfigured() ? currentStatus : 'unconfigured',
    error: lastErrorMessage,
  };
}

export function isFirebaseLive(): boolean {
  return isFirebaseConfigured() && currentStatus === 'connected';
}

function broadcastStatus(status: FirebaseSyncStatus, errorMsg: string | null = null) {
  currentStatus = status;
  lastErrorMessage = errorMsg;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('firebase-sync-status', {
        detail: { status, errorMsg },
      })
    );
  }
}

/**
 * Actively tests connection to Firebase Firestore and returns diagnostics.
 */
export async function testFirebaseConnection(
  flatId: string = 'flat'
): Promise<{
  ok: boolean;
  latencyMs?: number;
  projectId?: string;
  docExists?: boolean;
  memberCount?: number;
  error?: string;
}> {
  if (!isFirebaseConfigured()) {
    broadcastStatus('unconfigured', 'Firebase configuration missing');
    return { ok: false, error: 'Firebase configuration missing API Key or Project ID' };
  }

  const startTime = Date.now();
  try {
    const firestore = db || getFirebaseDb();
    const flatDocRef = doc(firestore, COLLECTION_NAME, flatId, 'state', DOC_ID);
    const snap = await getDoc(flatDocRef);
    const latencyMs = Date.now() - startTime;

    broadcastStatus('connected');
    const data = snap.exists() ? (snap.data() as AppState) : null;

    return {
      ok: true,
      latencyMs,
      projectId: firebaseConfig.projectId,
      docExists: snap.exists(),
      memberCount: data?.members?.length || 0,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Connection failed';
    broadcastStatus('error', errorMsg);
    return {
      ok: false,
      projectId: firebaseConfig.projectId,
      error: errorMsg,
    };
  }
}

/**
 * Subscribes to real-time updates from Firestore.
 * When other flatmates make payments or changes, state updates across all phones instantly.
 */
export function subscribeToFirebaseSync(
  flatId: string = 'flat',
  onUpdate: (state: AppState) => void,
  onStatusChange?: (status: FirebaseSyncStatus, errorMsg?: string) => void
): () => void {
  if (!isFirebaseConfigured()) {
    broadcastStatus('unconfigured');
    onStatusChange?.('unconfigured');
    return () => {};
  }

  let firestore;
  try {
    firestore = db || getFirebaseDb();
  } catch (e: any) {
    broadcastStatus('error', e?.message);
    onStatusChange?.('error', e?.message);
    return () => {};
  }

  if (!firestore) {
    broadcastStatus('unconfigured');
    onStatusChange?.('unconfigured');
    return () => {};
  }

  broadcastStatus('connecting');
  onStatusChange?.('connecting');

  try {
    const flatDocRef = doc(firestore, COLLECTION_NAME, flatId, 'state', DOC_ID);

    // Initial existence check & instant hydration via getDoc
    getDoc(flatDocRef)
      .then((snap) => {
        if (!snap.exists()) {
          const localState = loadAppState();
          const cleanLocal = JSON.parse(
            JSON.stringify({
              ...localState,
              lastUpdated: new Date().toISOString(),
            })
          );
          setDoc(flatDocRef, cleanLocal).catch((e) =>
            console.warn('Cloud initial seed notice:', e.message)
          );
        } else {
          // Immediately apply remote data so user doesn't wait
          const remoteData = snap.data() as AppState;
          if (remoteData && remoteData.members && remoteData.members.length > 0) {
            saveAppState(remoteData);
            onUpdate(remoteData);
          }
        }
        broadcastStatus('connected');
        onStatusChange?.('connected');
      })
      .catch((e) => {
        console.warn('Cloud reachability check:', e.message);
      });

    const unsubscribe = onSnapshot(
      flatDocRef,
      (snapshot) => {
        broadcastStatus('connected');
        onStatusChange?.('connected');
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as AppState;
          if (remoteData && remoteData.members && remoteData.members.length > 0) {
            saveAppState(remoteData);
            onUpdate(remoteData);
          }
        }
      },
      (error) => {
        console.warn('Firestore sync listener notice:', error.message);
        broadcastStatus('error', error.message);
        onStatusChange?.('error', error.message);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Could not establish Firestore subscription:', err);
    broadcastStatus('error', err?.message);
    onStatusChange?.('error', err?.message);
    return () => {};
  }
}

/**
 * Sanitizes object by removing all undefined fields which Firestore rejects.
 */
export function sanitizeStateForFirestore(state: AppState): Record<string, any> {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Pushes state change to Firestore in the background.
 */
export async function pushStateToFirebase(
  state: AppState,
  flatId: string = 'flat'
): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }

  try {
    const firestore = db || getFirebaseDb();
    if (!firestore) return false;

    const flatDocRef = doc(firestore, COLLECTION_NAME, flatId, 'state', DOC_ID);
    const sanitizedPayload = sanitizeStateForFirestore({
      ...state,
      lastUpdated: new Date().toISOString(),
    });
    await setDoc(flatDocRef, sanitizedPayload);
    broadcastStatus('connected');
    return true;
  } catch (err: any) {
    console.error('Critical notice syncing state to Firestore:', err);
    broadcastStatus('error', err?.message);
    return false;
  }
}

/**
 * Force-wipes Firestore to a blank slate with Holder and Prajwal.
 */
export async function wipeFirestoreToBlank(
  flatId: string = 'flat'
): Promise<AppState> {
  const blankState: AppState = getInitialAppState();
  saveAppState(blankState);

  if (isFirebaseConfigured()) {
    try {
      const firestore = db || getFirebaseDb();
      if (firestore) {
        const flatDocRef = doc(firestore, COLLECTION_NAME, flatId, 'state', DOC_ID);
        const cleanPayload = sanitizeStateForFirestore({
          ...blankState,
          lastUpdated: new Date().toISOString(),
        });
        await setDoc(flatDocRef, cleanPayload);
        broadcastStatus('connected');
      }
    } catch (err: any) {
      console.warn('Error wiping Firestore to blank:', err);
      broadcastStatus('error', err?.message);
    }
  }

  return blankState;
}
