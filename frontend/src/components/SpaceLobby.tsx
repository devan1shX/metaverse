"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Space } from "@/types/api";
import {
  Users,
  Calendar,
  LogIn,
  LogOut,
  Trash2,
  Edit,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";
import Image from "next/image";

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

  const getSpaceImage = () => {
    if (space.mapImageUrl) return space.mapImageUrl;

    const description = space.description?.toLowerCase() || "";
    if (description.includes("conference")) {
      return "/images/space-2.png";
    } else if (description.includes("remote")) {
      return "/images/space-1.png";
    }
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
      await onJoin();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to join space";
      setError(errorMsg);
      console.error("Failed to join space:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleEnterSpace = async () => {
    try {
      setIsEntering(true);
      setError(null);

      if (!isUserMember) {
        await onJoin();
      }

      router.push(`/game/${space.id}`);
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to enter space";
      setError(errorMsg);
      console.error("Failed to enter space:", error);
    } finally {
      setIsEntering(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="page-shell flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="card overflow-hidden">
          <div className="relative h-64 md:h-80">
            <Image
              src={getSpaceImage()}
              alt={`${space.name} map`}
              fill
              style={{ objectFit: "cover" }}
              className="brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,10,16,0.92)] via-[rgba(7,10,16,0.24)] to-transparent p-6 md:p-8 flex flex-col justify-end">
              <div className="mb-4 flex items-center gap-2">
                <span className="badge badge-info">
                  {space.isPublic ? "Open World" : "Invite Only"}
                </span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="max-w-2xl border-b border-[rgba(239,188,130,0.28)] bg-transparent px-1 py-2 font-display text-3xl font-semibold tracking-[-0.04em] text-white outline-none"
                />
              ) : (
                <h1 className="font-display text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  {space.name}
                </h1>
              )}
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="mt-3 w-full max-w-2xl rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  rows={3}
                />
              ) : (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
                  {space.description || "A shared space ready for your next session."}
                </p>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
                <Users className="mx-auto mb-2 h-5 w-5 text-[var(--accent)]" />
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {space.currentUsers}/{space.maxUsers}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Users
                </p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
                <Calendar className="mx-auto mb-2 h-5 w-5 text-[var(--accent)]" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatDate(space.createdAt)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Created
                </p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
                {space.isPublic ? (
                  <Globe className="mx-auto mb-2 h-5 w-5 text-[var(--accent)]" />
                ) : (
                  <Lock className="mx-auto mb-2 h-5 w-5 text-[var(--accent)]" />
                )}
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {space.isPublic ? "Public" : "Private"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Visibility
                </p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center">
                <p className="font-display text-lg font-semibold tracking-[-0.03em] text-[var(--accent-strong)]">
                  Space ID
                </p>
                <p className="mt-2 truncate text-xs text-[var(--text-muted)]">
                  {space.id}
                </p>
              </div>
            </div>

            {error && (
              <div
                className="mb-6 rounded-[22px] border px-4 py-3 text-sm"
                style={{
                  background: "var(--danger-soft)",
                  borderColor: "rgba(239, 124, 120, 0.2)",
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {isUserMember ? (
                <button
                  onClick={handleEnterSpace}
                  disabled={isEntering}
                  className="btn-success"
                >
                  {isEntering ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Entering...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Enter Space
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="btn-secondary"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Space"
                    )}
                  </button>
                  <button
                    onClick={handleEnterSpace}
                    disabled={isEntering || isJoining}
                    className="btn-success"
                  >
                    {isEntering ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Entering...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-5 w-5" />
                        Enter Space
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                {isUserMember && !isUserAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        setError(null);
                        await onLeave();
                      } catch (error: any) {
                        const errorMsg =
                          error?.response?.data?.message ||
                          error?.message ||
                          "Failed to leave space";
                        setError(errorMsg);
                        console.error("Failed to leave space:", error);
                      }
                    }}
                    className="btn-danger"
                    title="Leave Space"
                  >
                    <LogOut className="h-4 w-4" />
                    Leave
                  </button>
                )}

                {isUserAdmin && (
                  <>
                    {isEditing ? (
                      <button
                        onClick={handleUpdate}
                        className="btn-success"
                        title="Save Changes"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="btn-secondary"
                        title="Edit Space"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this space? This action cannot be undone."
                          )
                        ) {
                          try {
                            setError(null);
                            await onDelete();
                          } catch (error: any) {
                            const errorMsg =
                              error?.response?.data?.message ||
                              error?.message ||
                              "Failed to delete space";
                            setError(errorMsg);
                            console.error("Failed to delete space:", error);
                          }
                        }
                      }}
                      className="btn-danger"
                      title="Delete Space"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
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
