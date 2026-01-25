import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    UserCredential,
} from "firebase/auth";
import { auth } from "./config";

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (
    email: string,
    password: string
): Promise<UserCredential> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        return userCredential;
    } catch (error: any) {
        console.error("Firebase signup error:", error);
        throw new Error(getFirebaseErrorMessage(error.code));
    }
};

/**
 * Sign in an existing user with email and password
 */
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<UserCredential> => {
    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );
        return userCredential;
    } catch (error: any) {
        console.error("Firebase signin error:", error);
        throw new Error(getFirebaseErrorMessage(error.code));
    }
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        return userCredential;
    } catch (error: any) {
        console.error("Google signin error:", error);
        throw new Error(getFirebaseErrorMessage(error.code));
    }
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error: any) {
        console.error("Firebase signout error:", error);
        throw new Error("Failed to sign out");
    }
};

/**
 * Get the current Firebase user
 */
export const getCurrentUser = (): FirebaseUser | null => {
    return auth.currentUser;
};

/**
 * Get the Firebase ID token for the current user
 */
export const getAuthToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
        return null;
    }
    try {
        const token = await user.getIdToken();
        return token;
    } catch (error) {
        console.error("Error getting auth token:", error);
        return null;
    }
};

/**
 * Listen to authentication state changes
 */
export const onAuthChange = (
    callback: (user: FirebaseUser | null) => void
) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Convert Firebase error codes to user-friendly messages
 */
const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case "auth/email-already-in-use":
            return "This email is already registered. Please sign in instead.";
        case "auth/invalid-email":
            return "Invalid email address.";
        case "auth/operation-not-allowed":
            return "Email/password accounts are not enabled.";
        case "auth/weak-password":
            return "Password should be at least 6 characters.";
        case "auth/user-disabled":
            return "This account has been disabled.";
        case "auth/user-not-found":
            return "No account found with this email.";
        case "auth/wrong-password":
            return "Incorrect password.";
        case "auth/invalid-credential":
            return "Invalid email or password.";
        case "auth/popup-closed-by-user":
            return "Sign-in popup was closed before completion.";
        case "auth/cancelled-popup-request":
            return "Only one popup request is allowed at a time.";
        case "auth/popup-blocked":
            return "Sign-in popup was blocked by the browser.";
        case "auth/network-request-failed":
            return "Network error. Please check your connection.";
        case "auth/too-many-requests":
            return "Too many failed attempts. Please try again later.";
        default:
            return "An error occurred during authentication.";
    }
};
