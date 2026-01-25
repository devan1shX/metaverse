"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authAPI, userAPI } from "@/lib/api";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  onAuthChange,
  getAuthToken,
} from "@/lib/firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";

// User interface for PostgreSQL user data
export interface User {
  id: string;
  user_name: string;
  email: string;
  role: string;
  user_avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    userLevel: string
  ) => Promise<boolean>;
  loginWithGoogle: (userLevel: string) => Promise<boolean>;
  signup: (
    userName: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  signupWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<boolean>;
  updateUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_AVATAR = "/avatars/avatar-2.png";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sync Firebase user with backend (create/fetch from PostgreSQL)
  const syncUserWithBackend = async (
    firebaseUser: FirebaseUser,
    userLevel: string = "participant"
  ): Promise<User | null> => {
    try {
      const token = await firebaseUser.getIdToken();
      
      // Store Firebase token for API calls
      localStorage.setItem("firebase_token", token);

      // Sync with backend - this will create user in PostgreSQL if not exists
      const response = await authAPI.syncFirebaseUser(token, userLevel);
      
      if (response.data.success && response.data.user) {
        const backendUser = response.data.user;
        
        const userData: User = {
          id: backendUser.id,
          user_name: backendUser.username,
          email: backendUser.email,
          role: backendUser.role,
          user_avatar_url:
            backendUser.avatarUrl &&
            !backendUser.avatarUrl.includes("placeholder.com")
              ? backendUser.avatarUrl
              : DEFAULT_AVATAR,
        };

        setUser(userData);
        localStorage.setItem("metaverse_user", JSON.stringify(userData));
        return userData;
      }
      
      return null;
    } catch (error: any) {
      console.error("Failed to sync user with backend:", error);
      
      const errorMessage = error.response?.data?.message || "Failed to sync user with server.";
      const backendErrors = error.response?.data?.errors;
      
      if (backendErrors && Array.isArray(backendErrors) && backendErrors.length > 0) {
        throw new Error(backendErrors.join(", "));
      }
      
      throw new Error(errorMessage);
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        try {
          // Get fresh token
          const token = await firebaseUser.getIdToken(true);
          localStorage.setItem("firebase_token", token);
          
          // Check if we have user data in localStorage
          const storedUser = localStorage.getItem("metaverse_user");
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            // Sync with backend if no stored user data
            await syncUserWithBackend(firebaseUser);
          }
        } catch (error) {
          console.error("Error handling auth state change:", error);
        }
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem("metaverse_user");
        localStorage.removeItem("firebase_token");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle auth errors from API
  useEffect(() => {
    const handleAuthError = async () => {
      console.log("Auth error event received. Logging out.");
      await logout();
    };

    window.addEventListener("auth-error", handleAuthError);

    return () => {
      window.removeEventListener("auth-error", handleAuthError);
    };
  }, [router]);

  // Token refresh - Firebase handles this automatically
  useEffect(() => {
    const refreshToken = setInterval(async () => {
      const token = await getAuthToken();
      if (token) {
        localStorage.setItem("firebase_token", token);
      }
    }, 50 * 60 * 1000); // Refresh every 50 minutes (tokens expire in 1 hour)

    return () => clearInterval(refreshToken);
  }, []);

  // Email/Password Login
  const login = async (
    email: string,
    password: string,
    userLevel: string
  ): Promise<boolean> => {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmail(email, password);
      
      // Sync with backend
      await syncUserWithBackend(userCredential.user, userLevel);
      
      return true;
    } catch (error: any) {
      throw error; // Firebase error messages are already user-friendly
    }
  };

  // Google Sign-in Login
  const loginWithGoogle = async (userLevel: string): Promise<boolean> => {
    try {
      // Sign in with Google
      const userCredential = await signInWithGoogle();
      
      // Sync with backend
      await syncUserWithBackend(userCredential.user, userLevel);
      
      return true;
    } catch (error: any) {
      throw error;
    }
  };

  // Email/Password Signup
  const signup = async (
    userName: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Create user in Firebase
      const userCredential = await signUpWithEmail(email, password);
      
      // Sync with backend (will create user in PostgreSQL with default role)
      await syncUserWithBackend(userCredential.user, "participant");
      
      return true;
    } catch (error: any) {
      throw error;
    }
  };

  // Google Sign-in Signup
  const signupWithGoogle = async (): Promise<boolean> => {
    try {
      // Sign in with Google (creates account if doesn't exist)
      const userCredential = await signInWithGoogle();
      
      // Sync with backend
      await syncUserWithBackend(userCredential.user, "participant");
      
      return true;
    } catch (error: any) {
      throw error;
    }
  };

  // Update user avatar
  const updateUserAvatar = async (avatarUrl: string): Promise<boolean> => {
    if (!user) {
      console.error("No user logged in to update avatar for.");
      return false;
    }
    try {
      const response = await userAPI.updateAvatar(user.id, avatarUrl);

      if (
        response.data.success &&
        response.data.message === "Avatar updated successfully"
      ) {
        const backendUser = response.data.user;

        const updatedUser: User = {
          id: backendUser.id,
          user_name: backendUser.username,
          email: backendUser.email,
          role: backendUser.role,
          user_avatar_url: backendUser.avatarUrl,
        };

        setUser(updatedUser);
        localStorage.setItem("metaverse_user", JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Failed to update avatar:", error);
      return false;
    }
  };

  // Update username
  const updateUsername = async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      console.error("No user logged in to update username for.");
      return { success: false, error: "Not logged in" };
    }
    try {
      const response = await userAPI.updateUsername(user.id, username);

      if (
        response.data.success &&
        response.data.message === "Username updated successfully"
      ) {
        const backendUser = response.data.user;

        const updatedUser: User = {
          id: backendUser.id,
          user_name: backendUser.username,
          email: backendUser.email,
          role: backendUser.role,
          user_avatar_url: backendUser.avatarUrl,
        };

        setUser(updatedUser);
        localStorage.setItem("metaverse_user", JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: response.data.message };
    } catch (error: any) {
      console.error("Failed to update username:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to update username" 
      };
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      // Call backend logout
      await authAPI.logout();
    } catch (error) {
      console.error("Logout API error:", error);
    }
    
    try {
      // Sign out from Firebase
      await signOutUser();
    } catch (error) {
      console.error("Firebase signout error:", error);
    }
    
    // Clear local state
    setUser(null);
    localStorage.removeItem("metaverse_user");
    localStorage.removeItem("firebase_token");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        login, 
        loginWithGoogle,
        signup, 
        signupWithGoogle,
        logout, 
        updateUserAvatar,
        updateUsername
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}