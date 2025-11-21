"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import SpaceLobby from "@/components/SpaceLobby";
import { useSpace } from "@/hooks/useApi";
import { useSpaces } from "@/contexts/SpacesContext";

export default function SpacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const spaceId = params.spaceId as string;

  // Fetching specific space details
  const {
    data: spaceData,
    loading: spaceLoading,
    error: spaceError,
    refetch: refetchSpace,
  } = useSpace(spaceId);

  // Accessing space actions and user's space list from context
  const { joinSpace, leaveSpace, deleteSpace, updateSpace, mySpaces } =
    useSpaces();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Combined loading state
  if (authLoading || spaceLoading || !user) {
    return <LoadingScreen />;
  }

  // Error handling
  if (spaceError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400">
        Error loading space: {spaceError}
      </div>
    );
  }

  // Handling case where space is not found
  if (!spaceData?.space) {
    return (
      <div className="flex items-center justify-center h-screen">
        Space not found
      </div>
    );
  }

  const space = spaceData.space;
  const isUserAdmin = space.adminUserId === user.id;
  // Check if the current space is in the user's list of joined/created spaces
  const isUserMember = mySpaces.some((s) => s.id === space.id);

  // Action handlers
  const handleJoin = async () => {
    try {
      console.log("SpacePage: handleJoin called with spaceId:", spaceId);
      console.log("SpacePage: Calling joinSpace from context");
      const result = await joinSpace(spaceId);
      console.log("SpacePage: joinSpace result:", result);
      // Refresh space data and user's spaces list
      await Promise.all([
        refetchSpace(),
        // The SpacesContext should already refresh mySpaces after joinSpace
      ]);
      console.log("SpacePage: Space data refreshed after join");
    } catch (error: any) {
      console.error("SpacePage: Failed to join space:", error);
      console.error("SpacePage: Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        stack: error?.stack,
      });
      // Re-throw to let SpaceLobby handle the error display
      throw error;
    }
  };

  const handleLeave = async () => {
    try {
      await leaveSpace(spaceId);
      router.push("/dashboard"); // Redirect after leaving
    } catch (error) {
      console.error("Failed to leave space:", error);
    }
  };

  const handleDelete = async () => {
    if (isUserAdmin) {
      try {
        await deleteSpace(spaceId);
        router.push("/dashboard"); // Redirect after deleting
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
      space={space}
      isUserAdmin={isUserAdmin}
      isUserMember={isUserMember}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  );
}