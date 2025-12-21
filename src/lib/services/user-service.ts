import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
import { User } from "firebase/auth";

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    language?: string;
    isSuperAdmin?: boolean; // Super Admin privilege
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
            language: "en",
            isSuperAdmin: false, // Default to false
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

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
        console.log("User profile updated for", uid);

        // If photoURL or displayName changed, update all league member documents
        if (data.photoURL !== undefined || data.displayName !== undefined) {
            const { collection, query, where, getDocs } = await import("firebase/firestore");

            // Find all leagues this user is a member of using collection group query
            const membersQuery = query(
                collection(db, "leagues"),
            );
            const leaguesSnap = await getDocs(membersQuery);

            // Update each member document
            const updatePromises: Promise<void>[] = [];
            for (const leagueDoc of leaguesSnap.docs) {
                const memberRef = doc(db, "leagues", leagueDoc.id, "members", uid);
                const updateData: any = {};
                if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
                if (data.displayName !== undefined) updateData.displayName = data.displayName;

                updatePromises.push(
                    updateDoc(memberRef, updateData).catch((err) => {
                        // Member doc might not exist in this league, that's OK
                        console.log(`Could not update member doc in league ${leagueDoc.id}:`, err.message);
                    })
                );
            }

            await Promise.all(updatePromises);
            console.log("Synced profile changes to league member documents");
        }
    } catch (error) {
        console.error("Error updating user profile", error);
        throw error;
    }
}

export async function uploadUserAvatar(file: File, uid: string): Promise<string> {
    const storageRef = ref(storage, `avatars/${uid}/${file.name}`);
    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading avatar", error);
        throw error;
    }
}
