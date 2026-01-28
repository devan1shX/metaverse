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
  Globe,
  Lock,
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

  // Determine the correct image based on space description
  const getSpaceImage = () => {
    if (space.mapImageUrl) return space.mapImageUrl;

    const description = space.description?.toLowerCase() || "";
    if (description.includes("conference")) {
      return "/images/space-2.png";
    } else if (description.includes("remote")) {
      return "/images/space-1.png";
    }
    // Default fallback
    return "/images/space-1.png";
  };

  const handleUpdate = async () => {
    try {
      setError(null);
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
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to join space";
      setError(errorMsg);
      console.error("SpaceLobby: Failed to join space:", error);
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
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="card overflow-hidden">
          {/* Header Image */}
          <div className="h-56 md:h-64 relative">
            <Image
              src={getSpaceImage()}
              alt={`${space.name} map`}
              fill
              style={{ objectFit: 'cover' }}
              className="brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6 flex flex-col justify-end">
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-3xl md:text-4xl font-bold text-white bg-white/10 backdrop-blur-sm border-b-2 border-indigo-400 focus:outline-none px-2 py-1 rounded"
                />
              ) : (
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {space.name}
                </h1>
              )}
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="text-white mt-2 bg-white/10 backdrop-blur-sm border-b-2 border-indigo-400 focus:outline-none w-full px-2 py-1 rounded"
                  rows={2}
                />
              ) : (
                <p className="text-white/90 mt-2 drop-shadow">{space.description}</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                <Users className="mx-auto mb-2 text-indigo-600 w-6 h-6" />
                <p className="font-semibold text-gray-900 text-lg">
                  {space.currentUsers}/{space.maxUsers}
                </p>
                <p className="text-xs text-gray-500 mt-1">Users</p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                <Calendar className="mx-auto mb-2 text-purple-600 w-6 h-6" />
                <p className="font-semibold text-gray-900 text-sm">{formatDate(space.createdAt)}</p>
                <p className="text-xs text-gray-500 mt-1">Created</p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                {space.isPublic ? (
                  <Globe className="mx-auto mb-2 text-green-600 w-6 h-6" />
                ) : (
                  <Lock className="mx-auto mb-2 text-orange-600 w-6 h-6" />
                )}
                <p className={`font-semibold ${
                  space.isPublic ? "text-green-600" : "text-orange-600"
                }`}>
                  {space.isPublic ? "Public" : "Private"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Visibility</p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                <div className="font-bold text-lg text-indigo-600 mb-1">ID</div>
                <p className="text-xs text-gray-600 truncate">{space.id}</p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 card p-4 bg-red-50 border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {isUserMember ? (
                <button
                  onClick={handleEnterSpace}
                  disabled={isEntering}
                  className="btn-success w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {isEntering ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Entering...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
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
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
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
                    className="btn-success flex items-center justify-center gap-2"
                  >
                    {isEntering ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Entering...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
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
                    className="bg-red-600 hover:bg-red-700 text-white font-medium p-3 rounded-lg transition-colors shadow-sm"
                    title="Leave Space"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
                {isUserAdmin && (
                  <>
                    {isEditing ? (
                      <button
                        onClick={handleUpdate}
                        className="btn-success p-3"
                        title="Save Changes"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="btn-secondary p-3"
                        title="Edit Space"
                      >
                        <Edit className="w-5 h-5" />
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
                      className="bg-red-600 hover:bg-red-700 text-white font-medium p-3 rounded-lg transition-colors shadow-sm"
                      title="Delete Space"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
