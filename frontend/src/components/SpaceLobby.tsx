"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Space } from "@/types/api";
import {
  Users,
  Calendar,
  Settings,
  LogIn,
  LogOut,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import Image from "next/image";

// Define the props interface
interface SpaceLobbyProps {
  space: Space;
  isUserAdmin: boolean;
  isUserMember: boolean;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdate: (updateData: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    maxUsers?: number;
  }) => Promise<void>;
}

export default function SpaceLobby({
  space,
  isUserAdmin,
  isUserMember,
  onJoin,
  onLeave,
  onDelete,
  onUpdate,
}: SpaceLobbyProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(space.name);
  const [editedDescription, setEditedDescription] = useState(
    space.description || ""
  );
  const [isJoining, setIsJoining] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    try {
      await onUpdate({
        name: editedName,
        description: editedDescription,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update space:", error);
      setError("Failed to update space");
    }
  };

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      setError(null);
      console.log("SpaceLobby: handleJoin called, calling onJoin()");
      await onJoin();
      console.log("SpaceLobby: onJoin() completed successfully");
      // After joining, refresh the page or update state
      // The parent component should handle the state update
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to join space";
      setError(errorMsg);
      console.error("SpaceLobby: Failed to join space:", error);
      console.error("SpaceLobby: Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleEnterSpace = async () => {
    try {
      setIsEntering(true);
      setError(null);
      
      // If user is not a member, join first
      if (!isUserMember) {
        await onJoin();
      }
      
      // Navigate to the game
      router.push(`/game/${space.id}`);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to enter space";
      setError(errorMsg);
      console.error("Failed to enter space:", error);
    } finally {
      setIsEntering(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#2a2a3e] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#35354e] rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
        <div className="h-48 md:h-64 relative">
          <Image
            src={space.mapImageUrl || "/images/office.png"}
            alt={`${space.name} map`}
            fill
            style={{ objectFit: 'cover' }}
            className="opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#35354e] to-transparent p-6 flex flex-col justify-end">
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-3xl md:text-4xl font-bold text-white bg-transparent border-b-2 border-purple-400 focus:outline-none"
              />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {space.name}
              </h1>
            )}
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="text-gray-300 mt-2 bg-transparent border-b-2 border-purple-400 focus:outline-none w-full"
                rows={2}
              />
            ) : (
              <p className="text-gray-300 mt-2">{space.description}</p>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div className="bg-white/5 p-3 rounded-lg">
              <Users className="mx-auto mb-1 text-purple-400" />
              <p className="font-semibold">
                {space.currentUsers}/{space.maxUsers}
              </p>
              <p className="text-xs text-gray-400">Users</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <Calendar className="mx-auto mb-1 text-purple-400" />
              <p className="font-semibold">{formatDate(space.createdAt)}</p>
              <p className="text-xs text-gray-400">Created</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <Settings className="mx-auto mb-1 text-purple-400" />
              <p
                className={`font-semibold ${
                  space.isPublic ? "text-green-400" : "text-orange-400"
                }`}
              >
                {space.isPublic ? "Public" : "Private"}
              </p>
              <p className="text-xs text-gray-400">Visibility</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="font-bold text-lg text-purple-400">ID</div>
              <p className="text-xs text-gray-400 truncate">{space.id}</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {isUserMember ? (
              <button
                onClick={handleEnterSpace}
                disabled={isEntering}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isEntering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entering...
                  </>
                ) : (
                  <>
                    <LogIn />
                    Enter Space
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    console.log("SpaceLobby: Join Space button clicked!");
                    handleJoin();
                  }}
                  disabled={isJoining}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Space"
                  )}
                </button>
                <button
                  onClick={handleEnterSpace}
                  disabled={isEntering || isJoining}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isEntering ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Entering...
                    </>
                  ) : (
                    <>
                      <LogIn />
                      Enter Space
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isUserMember && !isUserAdmin && (
                <button
                  onClick={async () => {
                    try {
                      setError(null);
                      await onLeave();
                    } catch (error: any) {
                      const errorMsg = error?.response?.data?.message || error?.message || "Failed to leave space";
                      setError(errorMsg);
                      console.error("Failed to leave space:", error);
                    }
                  }}
                  className="bg-red-600/80 hover:bg-red-700 text-white font-bold p-3 rounded-lg transition-colors"
                  title="Leave Space"
                >
                  <LogOut />
                </button>
              )}
              {isUserAdmin && (
                <>
                  {isEditing ? (
                    <button
                      onClick={handleUpdate}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold p-3 rounded-lg transition-colors"
                      title="Save Changes"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold p-3 rounded-lg transition-colors"
                      title="Edit Space"
                    >
                      <Edit />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this space? This action cannot be undone.")) {
                        try {
                          setError(null);
                          await onDelete();
                        } catch (error: any) {
                          const errorMsg = error?.response?.data?.message || error?.message || "Failed to delete space";
                          setError(errorMsg);
                          console.error("Failed to delete space:", error);
                        }
                      }
                    }}
                    className="bg-red-600/80 hover:bg-red-700 text-white font-bold p-3 rounded-lg transition-colors"
                    title="Delete Space"
                  >
                    <Trash2 />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
