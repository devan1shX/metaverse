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
import { LoginResponse, SignupResponse } from "@/types/api";

// *** FIXED: Export the User interface ***
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("metaverse_user");
    const storedToken = localStorage.getItem("metaverse_token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthError = () => {
      console.log("Auth error event received. Logging out.");
      setUser(null);
      localStorage.removeItem("metaverse_user");
      localStorage.removeItem("metaverse_token");
      router.push('/login');
    };

    window.addEventListener('auth-error', handleAuthError);

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, [router]);

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
    } catch (error: any) {
      throw new Error(
        error.response?.data?.errors?.[0] || "Invalid email or password."
      );
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

      if (signupData.success && signupData.user && signupData.token) {
        const newUser = signupData.user;
        const token = signupData.token;

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
        localStorage.setItem("metaverse_token", token);
        return true;
      }
      return false;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.errors?.[0] || "Could not create account."
      );
    }
  };

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
      if (
        error.response &&
        (error.response.status === 404 ||
          error.response.status === 401 ||
          error.response.status === 400)
      ) {
        // The interceptor will catch the 401 and fire the 'auth-error' event
      }
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("metaverse_user");
      localStorage.removeItem("metaverse_token");
      router.push("/login");
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