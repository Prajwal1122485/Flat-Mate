import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { AppState, saveAppState } from './storage';

const DOC_ID = 'flat_ledger_state';
const COLLECTION_NAME = 'flats';

/**
 * Subscribes to real-time updates from Firestore if configured.
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
    const unsubscribe = onSnapshot(
      flatDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as AppState;
          if (remoteData && remoteData.members) {
            saveAppState(remoteData);
            onUpdate(remoteData);
          }
        }
      },
      (error) => {
        console.warn('Firestore sync listener notice:', error.message);
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
  } catch (err) {
    console.error('Failed to sync state to Firestore:', err);
  }
}
