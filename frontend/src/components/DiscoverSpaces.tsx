"use client";

import { useState, useMemo } from "react";
import { Search, Users, Calendar, MapPin, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSpaces } from "@/contexts/SpacesContext";
import { Space } from "@/lib/api";

export function DiscoverSpaces() {
  const { user } = useAuth();
  const { allSpaces, loadingAllSpaces, errorAllSpaces, joinSpace, mySpaces } =
    useSpaces();
  const [searchQuery, setSearchQuery] = useState("");
  const [isJoining, setIsJoining] = useState<string | null>(null);

  const filteredSpaces = useMemo(() => {
    if (!allSpaces) return [];

    let spaces = allSpaces;

    if (searchQuery.trim()) {
      spaces = spaces.filter(
        (space) =>
          space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return spaces;
  }, [allSpaces, searchQuery]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleJoinSpace = async (spaceId: string) => {
    setIsJoining(spaceId);
    try {
      await joinSpace(spaceId);
    } catch (error) {
      console.error("Error joining space:", error);
    } finally {
      setIsJoining(null);
    }
  };

  const renderSpaceCard = (space: Space) => {
    const isUserInSpace =
      user?.id &&
      (space.adminUserId === user.id || mySpaces.some((s) => s.id === space.id));

    return (
      <div key={space.id} className="card card-hover p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="badge badge-info">
                {space.isPublic ? "Public" : "Private"}
              </span>
            </div>
            <h3 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {space.name}
            </h3>
            {space.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-[var(--text-muted)]">
                {space.description}
              </p>
            )}
          </div>
          {space.mapImageUrl && (
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/8">
              <Image
                src={space.mapImageUrl}
                alt={space.name}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <p className="surface-label">People</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Users className="h-4 w-4 text-[var(--accent)]" />
              {space.currentUsers}/{space.maxUsers}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <p className="surface-label">Created</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Calendar className="h-4 w-4 text-[var(--accent)]" />
              {formatDate(space.createdAt)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <p className="surface-label">Access</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <MapPin className="h-4 w-4 text-[var(--accent)]" />
              {space.isPublic ? "Open world" : "Invite only"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {isUserInSpace ? (
            <Link href={`/space/${space.id}`} className="btn-success">
              Enter Space
            </Link>
          ) : (
            <button
              onClick={() => handleJoinSpace(space.id)}
              disabled={isJoining === space.id || space.currentUsers >= space.maxUsers}
              className="btn-success"
            >
              {isJoining === space.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Join Space
                </>
              )}
            </button>
          )}

          {space.currentUsers >= space.maxUsers && !isUserInSpace && (
            <span style={{ color: "var(--danger)" }} className="text-xs font-medium">
              Space full
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loadingAllSpaces) {
    return (
      <div className="container-main py-8">
        <div className="flex h-96 items-center justify-center">
          <div className="glass-panel rounded-[28px] px-8 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" />
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Loading spaces...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorAllSpaces) {
    return (
      <div className="container-main py-8">
        <div className="card mx-auto max-w-md p-8 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <span className="text-xl">!</span>
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Error loading spaces
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{errorAllSpaces}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8">
      <div className="mb-8">
        <p className="surface-label">Discover</p>
        <h1 className="surface-title mt-3 font-display">Explore shared rooms</h1>
        <p className="surface-subtitle mt-3 max-w-2xl">
          Browse public spaces, join ongoing sessions, and move through the world
          without switching into a heavy dashboard mindset.
        </p>
      </div>

      <div className="card mb-6 p-4 sm:p-5">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
          <input
            type="search"
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11"
          />
        </div>
      </div>

      {filteredSpaces.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filteredSpaces.map(renderSpaceCard)}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/8 bg-white/[0.03]">
            <Image
              src="/images/avatar.png"
              alt="Avatar"
              width={56}
              height={56}
              className="rounded-full object-cover"
            />
          </div>
          <h3 className="font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {searchQuery ? "No spaces found" : "No spaces available"}
          </h3>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {searchQuery
              ? "Try adjusting your search."
              : "No public spaces are available right now."}
          </p>
          <Link href="/dashboard/create" className="btn-success mx-auto mt-6">
            <Plus className="h-4 w-4" />
            Create a Space
          </Link>
        </div>
      )}
    </div>
  );
}
