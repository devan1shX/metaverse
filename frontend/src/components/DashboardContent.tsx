"use client";

import { useMemo, useState } from "react";
import { useSpaces } from "@/contexts/SpacesContext";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Clock, Users, Calendar, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Space } from "@/types/api";
import { InviteModal } from "@/components/InviteModal";

type TabType = "visited" | "created";

export function DashboardContent() {
  const { mySpaces, loading, errorMySpaces } = useSpaces();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("visited");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedSpaceForInvite, setSelectedSpaceForInvite] = useState<{id: string, name: string} | null>(null);

  const { lastVisitedSpaces, createdSpaces } = useMemo(() => {
    if (!mySpaces || mySpaces.length === 0) {
      return { lastVisitedSpaces: [], createdSpaces: [] };
    }

    // For recently visited, show all spaces sorted by updatedAt or createdAt
    const lastVisited = [...mySpaces]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    // For created spaces, filter by adminUserId matching current user
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
    const spacesToDisplay = activeTab === "visited" ? lastVisitedSpaces : createdSpaces;

    if (!searchQuery.trim()) {
      return spacesToDisplay;
    }

    return spacesToDisplay.filter((space) =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeTab, lastVisitedSpaces, createdSpaces]);

  const getSpaceImage = (space: Space) => {
    const description = space.description?.toLowerCase() || "";
    if (description.includes("conference")) {
      return "/images/space-2.png";
    } else if (description.includes("remote")) {
      return "/images/space-1.png";
    }
    return space.mapImageUrl || "/images/space-1.png";
  };

  const handleInviteClick = (space: Space) => {
    setSelectedSpaceForInvite({ id: space.id, name: space.name });
    setInviteModalOpen(true);
  };

  const renderSpaceCard = (space: Space) => (
    <Link
      key={space.id}
      href={`/space/${space.id}`}
      className="group"
    >
      <div className="card card-hover h-full overflow-hidden flex flex-col">
        {/* Header with Image */}
        <div className="h-32 relative">
          <Image
            src={getSpaceImage(space)}
            alt={space.name}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
        
        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-1">
            {space.name}
          </h3>
          
          {space.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
              {space.description}
            </p>
          )}
          
          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center gap-1.5" title="Active users">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">{space.currentUsers}/{space.maxUsers}</span>
            </div>
            
            <div className="flex items-center gap-1.5" title="Created date">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span>{new Date(space.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>

            {/* Invite Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInviteClick(space);
              }}
              className="ml-auto flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors font-medium"
              title="Invite users to this space"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-indigo-600"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading spaces...</p>
        </div>
      </div>
    );
  }

  if (errorMySpaces) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="card max-w-md p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Error Loading Spaces</h3>
          <p className="text-sm text-gray-600">{errorMySpaces}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Spaces</h1>
        <p className="text-sm text-gray-600">Browse and join your virtual spaces</p>
      </div>

      {/* Tabs & Search */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("visited")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "visited"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Recently Visited
            </button>
            <button
              onClick={() => setActiveTab("created")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "created"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Created by Me
            </button>
          </div>

          
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Spaces Grid */}
      {displayedSpaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedSpaces.map((space) => renderSpaceCard(space))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative rounded-full overflow-hidden ring-4 ring-gray-100">
            <Image
              src="/images/avatar.png"
              alt="Avatar"
              fill
              style={{ objectFit: 'cover' }}
              className="bg-gray-100"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? "No Spaces Found" : activeTab === "visited" ? "No Recent Spaces" : "No Created Spaces"}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {searchQuery
              ? "Try adjusting your search"
              : activeTab === "visited"
              ? "Create or discover spaces to get started"
              : "Get started by creating your first space"}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard/create">
              <button className="btn-success text-sm">Create Space</button>
            </Link>
            <Link href="/discover">
              <button className="btn-secondary text-sm">Discover Spaces</button>
            </Link>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {selectedSpaceForInvite && (
        <InviteModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          spaceId={selectedSpaceForInvite.id}
          spaceName={selectedSpaceForInvite.name}
        />
      )}
    </div>
  );
}
