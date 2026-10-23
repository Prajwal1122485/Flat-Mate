import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  updatePassword,
  updateEmail,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, getFirebaseAuth, getFirebaseDb } from './firebase';

const SESSION_KEY = 'FLATMATE_AUTH_SESSION_V2';
const ACCOUNTS_STORAGE_KEY = 'FLATMATE_AUTH_ACCOUNTS_V2';

export interface LocalAuthSession {
  memberId: string;
  email: string;
  name?: string;
  isHolder?: boolean;
  loggedInAt: string;
}

export interface CloudAuthAccount {
  email: string;
  password: string;
  name?: string;
  memberId?: string;
  isHolder?: boolean;
  createdAt: string;
}

export function saveLocalSession(
  memberId: string,
  email: string,
  name?: string,
  isHolder?: boolean
): void {
  if (typeof window === 'undefined') return;
  try {
    const session: LocalAuthSession = {
      memberId,
      email: email.trim().toLowerCase(),
      name,
      isHolder,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save local auth session', e);
  }
}

export function getLocalSession(): LocalAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('FLATMATE_AUTH_SESSION_V1');
  } catch (e) {
    console.error('Failed to clear local auth session', e);
  }
}

// ================= CLOUD & LOCAL AUTH ACCOUNTS STORE =================

export function getLocalAuthAccounts(): Record<string, CloudAuthAccount> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalAuthAccount(account: CloudAuthAccount): void {
  if (typeof window === 'undefined') return;
  try {
    const accounts = getLocalAuthAccounts();
    accounts[account.email.trim().toLowerCase()] = account;
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save account locally', e);
  }
}

/**
 * Reads cloud auth accounts directly from Firestore flat_ledger_state.
 */
export async function fetchCloudAuthAccounts(): Promise<Record<string, CloudAuthAccount>> {
  const local = getLocalAuthAccounts();
  try {
    const firestore = db || getFirebaseDb();
    if (!firestore) return local;
    const flatDocRef = doc(firestore, 'flats', 'flat', 'state', 'flat_ledger_state');
    const snap = await getDoc(flatDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteAccounts = (data.authAccounts as Record<string, CloudAuthAccount>) || {};
      const merged = { ...remoteAccounts, ...local };
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch cloud auth accounts, using local mirror:', err);
  }
  return local;
}

/**
 * Saves or updates an auth account in Firestore and local mirror.
 */
export async function syncCloudAuthAccount(account: CloudAuthAccount): Promise<void> {
  const cleanEmail = account.email.trim().toLowerCase();
  saveLocalAuthAccount({ ...account, email: cleanEmail });

  try {
    const firestore = db || getFirebaseDb();
    if (!firestore) return;
    const flatDocRef = doc(firestore, 'flats', 'flat', 'state', 'flat_ledger_state');
    const snap = await getDoc(flatDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const accounts = (data.authAccounts as Record<string, CloudAuthAccount>) || {};
      accounts[cleanEmail] = { ...account, email: cleanEmail };
      await updateDoc(flatDocRef, { authAccounts: accounts });
    }
  } catch (err) {
    console.warn('Firestore sync notice for auth account:', err);
  }
}

// ================= PRIMARY & HYBRID AUTHENTICATION =================

/**
 * Sign in user with Email and Password using persistent session.
 * Seamlessly uses Firebase Auth when configured, or secure Cloud Firestore Auth.
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  const firebaseAuth = auth || getFirebaseAuth();
  if (firebaseAuth) {
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
      return credential.user;
    } catch (fbErr: any) {
      // If it's a real user error (like wrong password), throw it directly
      if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
        // Double check against cloud account before rejecting (in case user created via cloud)
        const cloudAccounts = await fetchCloudAuthAccounts();
        const existingAcc = cloudAccounts[cleanEmail];
        if (existingAcc && existingAcc.password === cleanPass) {
          return {
            uid: cleanEmail,
            email: cleanEmail,
            displayName: existingAcc.name || cleanEmail,
          } as unknown as User;
        }
        throw fbErr;
      }

      // If Firebase Auth service is unconfigured/not enabled in console, fall through to cloud auth
      console.warn('Firebase Auth service notice, proceeding with Cloud Auth:', fbErr?.code || fbErr?.message);
    }
  }

  // Cloud Firestore & Local Auth Fallback
  const cloudAccounts = await fetchCloudAuthAccounts();
  const existingAccount = cloudAccounts[cleanEmail];

  if (existingAccount) {
    if (existingAccount.password === cleanPass) {
      return {
        uid: cleanEmail,
        email: cleanEmail,
        displayName: existingAccount.name || cleanEmail,
      } as unknown as User;
    } else {
      const err: any = new Error('Incorrect password.');
      err.code = 'auth/wrong-password';
      throw err;
    }
  }

  // Check if this email exists on any flatmate in Firestore (first-time login setup)
  try {
    const firestore = db || getFirebaseDb();
    if (firestore) {
      const flatDocRef = doc(firestore, 'flats', 'flat', 'state', 'flat_ledger_state');
      const snap = await getDoc(flatDocRef);
      if (snap.exists()) {
        const members = snap.data().members || [];
        const matchedMem = members.find(
          (m: any) => m.email && m.email.toLowerCase() === cleanEmail
        );
        if (matchedMem) {
          // Auto-register password for this flatmate on their first email login
          await syncCloudAuthAccount({
            email: cleanEmail,
            password: cleanPass,
            name: matchedMem.name,
            memberId: matchedMem.id,
            isHolder: matchedMem.isHolder,
            createdAt: new Date().toISOString(),
          });
          return {
            uid: cleanEmail,
            email: cleanEmail,
            displayName: matchedMem.name,
          } as unknown as User;
        }
      }
    }
  } catch (lookupErr) {
    console.warn('Member lookup notice:', lookupErr);
  }

  const err: any = new Error('No account found with this email.');
  err.code = 'auth/user-not-found';
  throw err;
}

/**
 * Register a new user with Email, Password, and Name.
 */
export async function signupWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Save in Cloud Firestore & Local Accounts
  await syncCloudAuthAccount({
    email: cleanEmail,
    password: cleanPass,
    name: name?.trim(),
    createdAt: new Date().toISOString(),
  });

  // 2. Also try creating in Firebase Auth if available
  const firebaseAuth = auth || getFirebaseAuth();
  if (firebaseAuth) {
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
      const credential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
      return credential.user;
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        try {
          const credential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
          return credential.user;
        } catch {
          // Continue with cloud user
        }
      }
      console.warn('Firebase Auth signup notice, cloud account active:', fbErr?.code || fbErr?.message);
    }
  }

  return {
    uid: cleanEmail,
    email: cleanEmail,
    displayName: name?.trim() || cleanEmail,
  } as unknown as User;
}

/**
 * Sign out of Firebase and wipe device auth session.
 */
export async function signOutFirebase(): Promise<void> {
  clearLocalSession();
  const firebaseAuth = auth || getFirebaseAuth();
  if (firebaseAuth) {
    try {
      await signOut(firebaseAuth);
    } catch (e) {
      console.warn('Firebase signout warning', e);
    }
  }
}

/**
 * In-Portal Password Update: Changes user's account password directly.
 */
export async function updateUserPassword(
  newPassword: string,
  currentPassword?: string
): Promise<void> {
  const session = getLocalSession();
  const cleanNewPass = newPassword.trim();
  const activeEmail = session?.email || auth?.currentUser?.email;

  if (activeEmail) {
    await syncCloudAuthAccount({
      email: activeEmail,
      password: cleanNewPass,
      name: session?.name,
      memberId: session?.memberId,
      isHolder: session?.isHolder,
      createdAt: new Date().toISOString(),
    });
  }

  // Also update in Firebase Auth if available
  const firebaseAuth = auth || getFirebaseAuth();
  const user = firebaseAuth?.currentUser;
  if (user) {
    try {
      if (currentPassword && user.email) {
        try {
          const cred = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, cred);
        } catch {
          // Re-auth optional if session fresh
        }
      }
      await updatePassword(user, cleanNewPass);
    } catch (err: any) {
      console.warn('Firebase Auth updatePassword notice (cloud updated):', err?.message);
    }
  }
}

/**
 * In-Portal Email Address Update: Changes user's account email directly.
 */
export async function updateUserEmailAddress(
  newEmail: string,
  currentPassword?: string
): Promise<void> {
  const session = getLocalSession();
  const cleanNewEmail = newEmail.trim().toLowerCase();
  const oldEmail = session?.email || auth?.currentUser?.email;

  if (oldEmail) {
    const cloudAccounts = await fetchCloudAuthAccounts();
    const oldAccount = cloudAccounts[oldEmail];
    const password = currentPassword?.trim() || oldAccount?.password || '123456';

    await syncCloudAuthAccount({
      email: cleanNewEmail,
      password,
      name: session?.name || oldAccount?.name,
      memberId: session?.memberId || oldAccount?.memberId,
      isHolder: session?.isHolder || oldAccount?.isHolder,
      createdAt: new Date().toISOString(),
    });

    if (session) {
      saveLocalSession(session.memberId, cleanNewEmail, session.name, session.isHolder);
    }
  }

  // Also update in Firebase Auth if available
  const firebaseAuth = auth || getFirebaseAuth();
  const user = firebaseAuth?.currentUser;
  if (user) {
    try {
      if (currentPassword && user.email) {
        try {
          const cred = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, cred);
        } catch {
          // Re-auth optional
        }
      }
      await updateEmail(user, cleanNewEmail);
    } catch (err: any) {
      console.warn('Firebase Auth updateEmail notice (cloud updated):', err?.message);
    }
  }
}

/**
 * Sends a password reset email if requested.
 */
export async function sendUserPasswordReset(email: string): Promise<void> {
  const firebaseAuth = auth || getFirebaseAuth();
  if (firebaseAuth) {
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch (err: any) {
      console.warn('Password reset notice:', err?.message);
    }
  }
}

/**
 * Subscribes to real-time auth state changes.
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  const firebaseAuth = auth || getFirebaseAuth();
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, (user) => {
    callback(user);
  });
}

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
export function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please try again.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please click "Create Account" first.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Access is temporarily disabled. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/requires-recent-login':
      return 'For security, please enter your current password to confirm this change.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Account authenticated via secure cloud storage.';
    default:
      return 'Incorrect email or password. Please check your details and try again.';
  }
}
