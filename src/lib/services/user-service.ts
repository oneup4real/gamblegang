import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { User } from "firebase/auth";

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    createdAt: any;
    updatedAt: any;
}

export async function createUserProfile(user: User) {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            await setDoc(userRef, newProfile);
            console.log("User profile created for", user.uid);
        } catch (error) {
            console.error("Error creating user profile", error);
        }
    } else {
        // Optionally update last login timestamp or sync profile fields if needed
        // For now we just ensure it exists
    }
}
