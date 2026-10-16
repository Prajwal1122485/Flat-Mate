import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { AppState, saveAppState, loadAppState } from './storage';

const DOC_ID = 'flat_ledger_state';
const COLLECTION_NAME = 'flats';

let isCloudConnected = false;

export function isFirebaseLive(): boolean {
  return isFirebaseConfigured() && isCloudConnected;
}

/**
 * Subscribes to real-time updates from Firestore.
 * When other flatmates make payments or changes, state updates across all phones instantly.
 */
export function subscribeToFirebaseSync(
  flatId: string = 'flat_304',
  onUpdate: (state: AppState) => void
): () => void {
  if (!isFirebaseConfigured() || !db) {
    return () => {};
  }

  try {
    const flatDocRef = doc(db, COLLECTION_NAME, flatId, 'state', DOC_ID);

    // Check if cloud document exists; if not, initialize cloud with local state
    getDoc(flatDocRef).then((snap) => {
      if (!snap.exists()) {
        const localState = loadAppState();
        setDoc(flatDocRef, {
          ...localState,
          lastUpdated: new Date().toISOString(),
        }).catch((e) => console.warn('Cloud initial seed notice:', e.message));
      }
    }).catch((e) => console.warn('Cloud reachability check:', e.message));

    const unsubscribe = onSnapshot(
      flatDocRef,
      (snapshot) => {
        isCloudConnected = true;
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
        isCloudConnected = false;
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish Firestore subscription:', err);
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
    isCloudConnected = true;
  } catch (err) {
    console.warn('Notice syncing state to Firestore:', err);
  }
}
