"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { DashboardHeader } from "@/components/DashboardHeader";
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
      <>
        <DashboardHeader avatarUrl={user.user_avatar_url} />
        <div className="container-main py-12">
          <div className="card p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Space</h3>
            <p className="text-sm text-gray-600">{spaceError}</p>
          </div>
        </div>
      </>
    );
  }

  // Handling case where space is not found
  if (!spaceData?.space) {
    return (
      <>
        <DashboardHeader avatarUrl={user.user_avatar_url} />
        <div className="container-main py-12">
          <div className="card p-8 text-center max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Space Not Found</h3>
            <p className="text-sm text-gray-600">The space you're looking for doesn't exist.</p>
          </div>
        </div>
      </>
    );
  }

  const space = spaceData.space;
  const isUserAdmin = space.adminUserId === user.id;
  const isUserMember = mySpaces.some((s) => s.id === space.id);

  // Action handlers
  const handleJoin = async () => {
    try {
      console.log("SpacePage: handleJoin called with spaceId:", spaceId);
      console.log("SpacePage: Calling joinSpace from context");
      const result = await joinSpace(spaceId);
      console.log("SpacePage: joinSpace result:", result);
      await Promise.all([
        refetchSpace(),
      ]);
      console.log("SpacePage: Space data refreshed after join");
    } catch (error: any) {
      console.error("SpacePage: Failed to join space:", error);
      throw error;
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
    <>
      <DashboardHeader avatarUrl={user.user_avatar_url} />
      <SpaceLobby
        space={space}
        isUserAdmin={isUserAdmin}
        isUserMember={isUserMember}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </>
  );
}