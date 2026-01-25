"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import SpaceLobby from "@/components/SpaceLobby";
import { useSpace } from "@/hooks/useApi";
import { useSpaces } from "@/contexts/SpacesContext";
import { MetaverseGame } from "@/components/MetaverseGame";

export default function SpacePage() {
  // === 1. HOOKS ===
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const spaceId = params.spaceId as string;

  const {
    data: spaceData,
    loading: spaceLoading,
    error: spaceError,
    refetch: refetchSpace,
  } = useSpace(spaceId);

  const { joinSpace, leaveSpace, deleteSpace, updateSpace, mySpaces } =
    useSpaces();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // === 2. RENDER LOGIC ===

  // Show loading screen while auth or space data is loading
  if (authLoading || !user || (spaceLoading && !spaceData)) {
    return <LoadingScreen />;
  }

  // Handle errors
  if (spaceError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400">
        Error loading space: {spaceError}
      </div>
    );
  }

  // Handle space not found
  if (!spaceData?.space) {
    return (
      <div className="flex items-center justify-center h-screen">
        Space not found
      </div>
    );
  }

  // --- At this point, user and spaceData are loaded ---

  const isUserMember = mySpaces.some((s) => s.id === spaceId);
  const isUserAdmin = spaceData.space.adminUserId === user.id;

  // If user is a member or admin, render the game
  if (isUserMember || isUserAdmin) {
    console.log('🗺️ Loading game with mapId:', spaceData.space.mapId);
    console.log('📦 Full space data:', spaceData.space);
    
    return (
      <MetaverseGame
        spaceId={spaceId}
        spaceName={spaceData.space.name}
        user={user}
        logout={logout}
        mapId={spaceData.space.mapId}
        avatarUrl={user.user_avatar_url}
      />
    );
  }

  // --- If not a member/admin, show the lobby ---

  const handleJoin = async () => {
    try {
      await joinSpace(spaceId);
      await refetchSpace();
    } catch (error: any) {
      console.error("Failed to join space:", error);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveSpace(spaceId);
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to leave space:", error);
    }
  };

  const handleDelete = async () => {
    if (isUserAdmin) {
      try {
        await deleteSpace(spaceId);
        router.push("/dashboard");
      } catch (error) {
        console.error("Failed to delete space:", error);
      }
    }
  };

  const handleUpdate = async (updateData: any) => {
    if (isUserAdmin) {
      try {
        await updateSpace(spaceId, updateData);
        await refetchSpace();
      } catch (error) {
        console.error("Failed to update space:", error);
      }
    }
  };

  return (
    <SpaceLobby
      space={spaceData.space}
      isUserAdmin={isUserAdmin}
      isUserMember={isUserMember}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  );
}