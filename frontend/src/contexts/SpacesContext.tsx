"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { Space } from "@/types/api";
import { useAuth } from "./AuthContext";
import { useAllSpaces, useMySpaces, useSpaceManager } from "@/hooks/useApi";

interface SpacesContextType {
  // Data
  mySpaces: Space[];
  allSpaces: Space[];
  currentSpace: Space | null;

  // Loading states
  loadingMySpaces: boolean;
  loadingAllSpaces: boolean;
  loading: boolean;

  // Error states
  errorMySpaces: string | null;
  errorAllSpaces: string | null;

  // Actions
  fetchMySpaces: () => Promise<void>;
  fetchAllSpaces: () => Promise<void>;
  setCurrentSpace: (space: Space | null) => void;
  refreshSpaces: () => Promise<void>;

  // Space management actions
  createSpace: (spaceData: {
    name: string;
    description?: string;
    isPublic?: boolean;
    maxUsers?: number;
    mapType?: string;
  }) => Promise<any>;
  updateSpace: (
    spaceId: string,
    updateData: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      maxUsers?: number;
      mapType?: string;
    }
  ) => Promise<any>;
  deleteSpace: (spaceId: string) => Promise<any>;
  joinSpace: (spaceId: string) => Promise<any>;
  leaveSpace: (spaceId: string) => Promise<any>;

  // Computed values
  createdSpaces: Space[];
  joinedSpaces: Space[];
  totalSpacesCount: number;
}

const SpacesContext = createContext<SpacesContextType | undefined>(undefined);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);

  // Fetching spaces using custom hooks
  const {
    data: mySpacesData,
    loading: loadingMySpaces,
    error: errorMySpaces,
    refetch: fetchMySpaces,
  } = useMySpaces(false, !!user);

  const {
    data: allSpacesData,
    loading: loadingAllSpaces,
    error: errorAllSpaces,
    refetch: fetchAllSpaces,
  } = useAllSpaces({}, !!user);

  // Managing space actions using the custom hook
  const {
    createSpace: createSpaceAction,
    updateSpace: updateSpaceAction,
    deleteSpace: deleteSpaceAction,
    joinSpace: joinSpaceAction,
    leaveSpace: leaveSpaceAction,
    loading: managerLoading,
    error: managerError,
  } = useSpaceManager();

  // Memoizing derived state
  const mySpaces = useMemo(() => mySpacesData?.spaces || [], [mySpacesData]);
  const allSpaces = useMemo(() => allSpacesData?.spaces || [], [allSpacesData]);
  const createdSpaces = useMemo(() => mySpaces.filter((space) => space.adminUserId === user?.id), [mySpaces, user?.id]);
  const joinedSpaces = useMemo(() => mySpaces.filter((space) => space.adminUserId !== user?.id), [mySpaces, user?.id]);

  // Unified refresh function
  const refreshSpaces = useCallback(async () => {
    await Promise.all([fetchMySpaces(), fetchAllSpaces()]);
  }, [fetchMySpaces, fetchAllSpaces]);

  // Generic handler for all space actions to ensure data is refreshed
  const handleAction = async (action: Promise<any>) => {
    try {
      const result = await action;
      await refreshSpaces();
      return result;
    } catch (error) {
      console.error("Space action failed:", error);
      // Re-throw the error to be caught in the component
      throw error;
    }
  };

  // Exposing action functions
  const createSpace = (data: any) => handleAction(createSpaceAction(data));
  const updateSpace = (id: string, data: any) => handleAction(updateSpaceAction(id, data));
  const deleteSpace = (id: string) => handleAction(deleteSpaceAction(id));
  const joinSpace = (id: string) => handleAction(joinSpaceAction(id));
  const leaveSpace = (id: string) => handleAction(leaveSpaceAction(id));

 

  const value: SpacesContextType = {
    mySpaces,
    allSpaces,
    currentSpace,
    loadingMySpaces,
    loadingAllSpaces,
    loading: loadingMySpaces || loadingAllSpaces || managerLoading,
    errorMySpaces: errorMySpaces || managerError,
    errorAllSpaces,
    fetchMySpaces,
    fetchAllSpaces,
    setCurrentSpace,
    refreshSpaces,
    createSpace,
    updateSpace,
    deleteSpace,
    joinSpace,
    leaveSpace,
    createdSpaces,
    joinedSpaces,
    totalSpacesCount: mySpaces.length,
  };

  return (
    <SpacesContext.Provider value={value}>{children}</SpacesContext.Provider>
  );
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (context === undefined) {
    throw new Error("useSpaces must be used within a SpacesProvider");
  }
  return context;
}
