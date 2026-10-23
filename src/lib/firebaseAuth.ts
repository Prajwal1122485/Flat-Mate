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
import { auth, getFirebaseAuth } from './firebase';

const SESSION_KEY = 'FLATMATE_AUTH_SESSION_V2';

export interface LocalAuthSession {
  memberId: string;
  email: string;
  name?: string;
  isHolder?: boolean;
  loggedInAt: string;
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
    // Also clean up any legacy session keys
    localStorage.removeItem('FLATMATE_AUTH_SESSION_V1');
  } catch (e) {
    console.error('Failed to clear local auth session', e);
  }
}

/**
 * Sign in user with Email and Password using persistent session.
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const firebaseAuth = auth || getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured. Please check your credentials.');
  }

  // Ensure persistent session across browser reloads & restarts (like Gmail / YouTube)
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch (err) {
    console.warn('Could not set persistence explicitly, defaulting to standard', err);
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return credential.user;
}

/**
 * Register a new user with Email and Password.
 */
export async function signupWithEmail(email: string, password: string): Promise<User> {
  const firebaseAuth = auth || getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured. Please check your credentials.');
  }

  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch (err) {
    console.warn('Could not set persistence explicitly', err);
  }

  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return credential.user;
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
 * In-Portal Password Update: Changes user's Firebase account password directly.
 */
export async function updateUserPassword(
  newPassword: string,
  currentPassword?: string
): Promise<void> {
  const firebaseAuth = auth || getFirebaseAuth();
  const user = firebaseAuth?.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in. Please sign in again.');
  }

  if (currentPassword && user.email) {
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
    } catch (err: any) {
      console.warn('Re-authentication before password change failed:', err);
      throw new Error('Current password is incorrect. Please verify.');
    }
  }

  await updatePassword(user, newPassword.trim());
}

/**
 * In-Portal Email Address Update: Changes user's Firebase account email directly.
 */
export async function updateUserEmailAddress(
  newEmail: string,
  currentPassword?: string
): Promise<void> {
  const firebaseAuth = auth || getFirebaseAuth();
  const user = firebaseAuth?.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in. Please sign in again.');
  }

  if (currentPassword && user.email) {
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
    } catch (err: any) {
      console.warn('Re-authentication before email change failed:', err);
      throw new Error('Current password is required to change email. Please verify.');
    }
  }

  await updateEmail(user, newEmail.trim());
}

/**
 * Sends a password reset email if requested.
 */
export async function sendUserPasswordReset(email: string): Promise<void> {
  const firebaseAuth = auth || getFirebaseAuth();
  if (!firebaseAuth) throw new Error('Firebase Auth is not configured.');
  await sendPasswordResetEmail(firebaseAuth, email.trim());
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
      return 'This email is already registered. Please sign in instead, or use another email.';
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
    default:
      return 'Authentication failed. Please check your details and try again.';
  }
}
