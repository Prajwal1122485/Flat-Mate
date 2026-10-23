import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, getFirebaseAuth } from './firebase';

const SESSION_KEY = 'FLATMATE_AUTH_SESSION_V1';

export interface LocalAuthSession {
  memberId: string;
  email: string;
  loggedInAt: string;
}

export function saveLocalSession(memberId: string, email: string): void {
  if (typeof window === 'undefined') return;
  try {
    const session: LocalAuthSession = {
      memberId,
      email: email.trim().toLowerCase(),
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
 * Sign out of Firebase.
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
      return 'No account found with this email. Please click "Sign Up" to create one.';
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
    default:
      return 'Authentication failed. Please check your details and try again.';
  }
}
