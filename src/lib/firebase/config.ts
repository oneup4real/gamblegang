import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton pattern)
const app = (!getApps().length && firebaseConfig.apiKey)
    ? initializeApp(firebaseConfig)
    : (getApps().length ? getApp() : undefined);

// Export services, or throw/mock if app is not initialized
// We use 'any' to avoid strict type issues during build if app is undefined
const auth = app ? getAuth(app) : {} as any;
const db = app ? getFirestore(app) : {} as any;
const storage = app ? getStorage(app) : {} as any;
const analytics = (typeof window !== "undefined" && app) ? getAnalytics(app) : null;

export { auth, db, storage, analytics };
export default app;
