"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpaces } from "@/contexts/SpacesContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Users,
  Calendar,
  UserPlus,
  Video,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Space } from "@/types/api";
import { InviteModal } from "@/components/InviteModal";
import { CreateInterviewModal } from "@/components/CreateInterviewModal";
import { AnimatePresence } from "framer-motion";

type TabType = "visited" | "created";

export function DashboardContent() {
  const { mySpaces, loading, errorMySpaces, createSpace } = useSpaces();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("visited");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedSpaceForInvite, setSelectedSpaceForInvite] = useState<{
    id: string;
    name: string;
  } | null>(null);


  const { lastVisitedSpaces, createdSpaces } = useMemo(() => {
    if (!mySpaces || mySpaces.length === 0) {
      return { lastVisitedSpaces: [], createdSpaces: [] };
    }

    const lastVisited = [...mySpaces]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    const created = [...mySpaces]
      .filter((space) => space.adminUserId === user?.id)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

    return {
      lastVisitedSpaces: lastVisited,
      createdSpaces: created,
    };
  }, [mySpaces, user?.id]);

  const displayedSpaces = useMemo(() => {
    const spacesToDisplay =
      activeTab === "visited" ? lastVisitedSpaces : createdSpaces;

    if (!searchQuery.trim()) {
      return spacesToDisplay;
    }

    return spacesToDisplay.filter((space) =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeTab, lastVisitedSpaces, createdSpaces]);

  const getSpaceImage = (space: Space) => {
    if (space.mapImageUrl) return space.mapImageUrl;

    const description = space.description?.toLowerCase() || "";
    if (description.includes("conference")) {
      return "/images/space-2.png";
    } else if (description.includes("remote")) {
      return "/images/space-1.png";
    }
    return "/images/space-1.png";
  };

  const handleInviteClick = (space: Space) => {
    setSelectedSpaceForInvite({ id: space.id, name: space.name });
    setInviteModalOpen(true);
  };

  const renderSpaceCard = (space: Space) => (
    <Link key={space.id} href={`/space/${space.id}`} className="group block">
      <div className="card card-hover h-full">
        <div className="relative h-40 overflow-hidden">
          <Image
            src={getSpaceImage(space)}
            alt={space.name}
            fill
            style={{ objectFit: "cover" }}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,10,16,0.88)] via-[rgba(7,10,16,0.12)] to-transparent" />
          <div className="absolute left-4 top-4">
            <span className="badge badge-info">Shared Space</span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                {space.name}
              </h3>
              {space.description && (
                <p className="mt-1 line-clamp-1 text-sm text-white/72">
                  {space.description}
                </p>
              )}
            </div>
            <div className="rounded-full border border-white/12 bg-black/20 p-2 text-white/70 backdrop-blur">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="surface-label">People</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Users className="h-4 w-4 text-[var(--accent)]" />
                <span>
                  {space.currentUsers}/{space.maxUsers}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="surface-label">Created</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                <span>
                  {new Date(space.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Click to enter
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInviteClick(space);
              }}
              className="btn-secondary min-h-0 rounded-full px-3 py-2 text-xs"
              title="Invite users to this space"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </button>
          </div>
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="container-main py-10">
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

  if (errorMySpaces) {
    return (
      <div className="container-main py-10">
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
          <p className="mt-2 text-sm text-[var(--text-muted)]">{errorMySpaces}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="surface-label">Dashboard</p>
          <h1 className="surface-title mt-3 font-display">Your spaces</h1>
          <p className="surface-subtitle mt-3 max-w-2xl">
            Browse recent rooms, revisit team spaces, and launch focused sessions
            without pulling attention away from the world itself.
          </p>
        </div>

        <button
          onClick={() => setShowInterviewModal(true)}
          className="btn-success self-start rounded-full px-5"
          title="Start an interview session — gives you a shareable waiting room link"
        >
          <Video className="h-4 w-4" />
          Start Interview
        </button>
      </div>

      <div className="card mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="segmented-control self-start">
            <button
              onClick={() => setActiveTab("visited")}
              className="segmented-option"
              data-active={activeTab === "visited"}
            >
              Recently Visited
            </button>
            <button
              onClick={() => setActiveTab("created")}
              className="segmented-option"
              data-active={activeTab === "created"}
            >
              Created by Me
            </button>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              type="text"
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>
      </div>

      {displayedSpaces.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {displayedSpaces.map((space) => renderSpaceCard(space))}
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
            {searchQuery
              ? "No spaces found"
              : activeTab === "visited"
                ? "No recent spaces"
                : "No created spaces"}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-muted)]">
            {searchQuery
              ? "Try adjusting your search."
              : activeTab === "visited"
                ? "Create or discover spaces to start building your world."
                : "Get started by creating your first space."}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard/create" className="btn-success">
              Create Space
            </Link>
            <Link href="/discover" className="btn-secondary">
              Discover Spaces
            </Link>
          </div>
        </div>
      )}

      {selectedSpaceForInvite && (
        <InviteModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          spaceId={selectedSpaceForInvite.id}
          spaceName={selectedSpaceForInvite.name}
        />
      )}

      {/* Interview Space Creation Modal */}
      <AnimatePresence>
        {showInterviewModal && (
          <CreateInterviewModal
            onClose={() => setShowInterviewModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
