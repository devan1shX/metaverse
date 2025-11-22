"use client";

import { useState, useMemo } from "react";
import { Search, Users, Calendar, MapPin, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSpaces } from "@/contexts/SpacesContext";
import { Space } from "@/lib/api";

export function DiscoverSpaces() {
  const { user } = useAuth();
  const { 
    allSpaces, 
    loadingAllSpaces, 
    errorAllSpaces,
    joinSpace,
    mySpaces 
  } = useSpaces();
  const [searchQuery, setSearchQuery] = useState("");
  const [isJoining, setIsJoining] = useState<string | null>(null);

  // Filter spaces based on search query
  const filteredSpaces = useMemo(() => {
    if (!allSpaces) return [];
    
    let spaces = allSpaces;
    
    // Filter by search query
    if (searchQuery.trim()) {
      spaces = spaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return spaces;
  }, [allSpaces, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleJoinSpace = async (spaceId: string) => {
    setIsJoining(spaceId);
    try {
      const success = await joinSpace(spaceId);
      if (success) {
        console.log("Successfully joined space!");
      } else {
        console.error("Failed to join space");
      }
    } catch (error) {
      console.error("Error joining space:", error);
    } finally {
      setIsJoining(null);
    }
  };

  const renderSpaceCard = (space: Space) => {
    const isUserInSpace = user?.id && (
      space.adminUserId === user.id || 
      mySpaces.some(s => s.id === space.id)
    );
    
    return (
      <div key={space.id} className="card card-hover p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{space.name}</h3>
            {space.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{space.description}</p>
            )}
          </div>
          {space.mapImageUrl && (
            <div className="w-16 h-16 rounded-lg overflow-hidden ml-4 flex-shrink-0">
              <Image
                src={space.mapImageUrl}
                alt={space.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{space.currentUsers}/{space.maxUsers}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(space.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className={`badge ${
              space.isPublic ? 'badge-success' : 'badge-warning'
            }`}>
              {space.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {isUserInSpace ? (
            <Link
              href={`/space/${space.id}`}
              className="btn-primary text-sm"
            >
              Enter Space
            </Link>
          ) : (
            <button
              onClick={() => handleJoinSpace(space.id)}
              disabled={isJoining === space.id || space.currentUsers >= space.maxUsers}
              className="btn-success text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining === space.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Joining...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Join Space
                </>
              )}
            </button>
          )}
          
          {space.currentUsers >= space.maxUsers && !isUserInSpace && (
            <span className="text-xs text-red-500">Space Full</span>
          )}
        </div>
      </div>
    );
  };

  if (loadingAllSpaces) {
    return (
      <div className="container-main py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-indigo-600"></div>
            <p className="mt-3 text-gray-600 text-sm">Loading spaces...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorAllSpaces) {
    return (
      <div className="container-main py-8">
        <div className="card max-w-md mx-auto p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Error Loading Spaces</h3>
          <p className="text-sm text-gray-600">{errorAllSpaces}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Discover Spaces</h1>
        <p className="text-sm text-gray-600">Explore and join public spaces in the metaverse</p>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="search"
          placeholder="Search spaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Spaces Grid */}
      {filteredSpaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpaces.map(renderSpaceCard)}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative rounded-full overflow-hidden ring-4 ring-gray-100">
            <Image
              src="/images/avatar.png"
              alt="Avatar"
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? "No Spaces Found" : "No Spaces Available"}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {searchQuery
              ? "Try adjusting your search"
              : "No public spaces available at the moment"}
          </p>
          <Link href="/dashboard/create">
            <button className="btn-success text-sm flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create a Space
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
