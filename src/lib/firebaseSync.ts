import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
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
 * Subscribes to real-time updates from Firestore.
 * When other flatmates make payments or changes, state updates across all phones instantly.
 */
export function subscribeToFirebaseSync(
  flatId: string = 'flat_304',
  onUpdate: (state: AppState) => void,
  onStatusChange?: (status: FirebaseSyncStatus, errorMsg?: string) => void
): () => void {
  if (!isFirebaseConfigured() || !db) {
    broadcastStatus('unconfigured');
    onStatusChange?.('unconfigured');
    return () => {};
  }

  broadcastStatus('connecting');
  onStatusChange?.('connecting');

  try {
    const flatDocRef = doc(db, COLLECTION_NAME, flatId, 'state', DOC_ID);

    // Initial existence check
    getDoc(flatDocRef)
      .then((snap) => {
        if (!snap.exists()) {
          const localState = loadAppState();
          setDoc(flatDocRef, {
            ...localState,
            lastUpdated: new Date().toISOString(),
          }).catch((e) => console.warn('Cloud initial seed notice:', e.message));
        }
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
 * Pushes state change to Firestore in the background.
 */
export async function pushStateToFirebase(
  state: AppState,
  flatId: string = 'flat_304'
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    return;
  }

  try {
    const flatDocRef = doc(db, COLLECTION_NAME, flatId, 'state', DOC_ID);
    await setDoc(flatDocRef, {
      ...state,
      lastUpdated: new Date().toISOString(),
    });
    broadcastStatus('connected');
  } catch (err: any) {
    console.warn('Notice syncing state to Firestore:', err);
    broadcastStatus('error', err?.message);
  }
}

/**
 * Force-wipes Firestore to a completely blank slate with only Prajwal (Holder).
 */
export async function wipeFirestoreToBlank(
  flatId: string = 'flat_304'
): Promise<AppState> {
  const blankState: AppState = getInitialAppState();
  saveAppState(blankState);

  if (isFirebaseConfigured() && db) {
    try {
      const flatDocRef = doc(db, COLLECTION_NAME, flatId, 'state', DOC_ID);
      await setDoc(flatDocRef, blankState);
      broadcastStatus('connected');
    } catch (err: any) {
      console.warn('Error wiping Firestore to blank:', err);
      broadcastStatus('error', err?.message);
    }
  }

  return blankState;
}
