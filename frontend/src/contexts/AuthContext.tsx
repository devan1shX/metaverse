// AuthContext.js
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authAPI, userAPI } from "@/lib/api";
import { UserSafeObject, LoginResponse, SignupResponse } from "@/types/api";

interface User {
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
  signup: (
    userName: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_AVATAR = "/avatars/avatar-2.png";

// --- MODIFICATION START ---
// 1. Create a default "dummy" user object for development.
const dummyUser: User = {
    id: "dev-user-01",
    user_name: "DevUser",
    email: "developer@example.com",
    role: "admin",
    user_avatar_url: DEFAULT_AVATAR,
};
// --- MODIFICATION END ---


export function AuthProvider({ children }: { children: ReactNode }) {
  // --- MODIFICATION START ---
  // 2. Set the initial state to our dummy user and set loading to false.
  const [user, setUser] = useState<User | null>(dummyUser);
  const [loading, setLoading] = useState(false);
  // --- MODIFICATION END ---


  // 3. The useEffect hook that checks localStorage is no longer needed.
  /*
   useEffect(() => {
     const storedUser = localStorage.getItem("metaverse_user");
     const storedToken = localStorage.getItem("metaverse_token");
    
     if (storedUser && storedToken) {
       setUser(JSON.parse(storedUser));
     }
     setLoading(false);
   }, []);
  */

  const login = async (
    email: string,
    password: string,
    userLevel: string
  ): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password, userLevel);
      const loginData = response.data as LoginResponse;

      if (loginData.success && loginData.user && loginData.token) {
        const loggedInUser = loginData.user;
        const token = loginData.token;

        const userData: User = {
          id: loggedInUser.id,
          user_name: loggedInUser.username,
          email: loggedInUser.email,
          role: loggedInUser.role,
          user_avatar_url:
            loggedInUser.avatarUrl &&
            !loggedInUser.avatarUrl.includes("placeholder.com")
              ? loggedInUser.avatarUrl
              : DEFAULT_AVATAR,
        };

        setUser(userData);
        localStorage.setItem("metaverse_user", JSON.stringify(userData));
        localStorage.setItem("metaverse_token", token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const signup = async (
    userName: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await authAPI.signup(userName, email, password);
      const signupData = response.data as SignupResponse;

      if (signupData.success && signupData.user) {
        const newUser = signupData.user;
        // Note: Signup doesn't return a token in the current backend implementation
        // You may need to call login after successful signup

        const userData: User = {
          id: newUser.id,
          user_name: newUser.username,
          email: newUser.email,
          role: newUser.role || "participant",
          user_avatar_url:
            newUser.avatarUrl && !newUser.avatarUrl.includes("placeholder.com")
              ? newUser.avatarUrl
              : DEFAULT_AVATAR,
        };

        setUser(userData);
        localStorage.setItem("metaverse_user", JSON.stringify(userData));
        // Note: No token stored for signup, user will need to login
        return true;
      }
      return false;
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    }
  };

  const updateUserAvatar = async (avatarUrl: string): Promise<boolean> => {
    if (!user) {
      console.error("No user logged in to update avatar for.");
      return false;
    }
    try {
      const response = await userAPI.updateAvatar(user.id, avatarUrl);

      if (response.data.success && response.data.message === "Avatar updated successfully") {
        const backendUser = response.data.user;

        // Map backend response to frontend User structure
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
    } catch (error) {
      console.error("Failed to update avatar:", error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call the logout API to invalidate the token
      await authAPI.logout();
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage and state
      setUser(null);
      localStorage.removeItem("metaverse_user");
      localStorage.removeItem("metaverse_token");
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, updateUserAvatar }}
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