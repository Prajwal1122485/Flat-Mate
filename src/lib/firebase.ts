// Firebase configuration and initialization
// Seamlessly syncs FlatMate Register data across devices in real-time
// Connected to user's Firebase Project: flatmate-register

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB2nCkDt1zHTRjy_KxT0_pKlJMbDd9QkEo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "flatmate-register.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "flatmate-register",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "flatmate-register.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "260672350685",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:260672350685:web:1a2bdcb68b2aa154c1ae34",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-41PC94LB25",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  return getAuth(getFirebaseApp());
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getFirebaseApp();
  db = getFirebaseDb();
  auth = getFirebaseAuth();
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}

export { app, db, auth };
