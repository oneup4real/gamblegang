import "server-only";
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// You should populate these environment variables or use the standard GOOGLE_APPLICATION_CREDENTIALS
// For local development with emulators, admin SDK automatically works if configured correctly.
// For production, we need a service account.

const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const app = !getApps().length
    ? initializeApp({
        credential: cert(serviceAccount),
    })
    : getApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
