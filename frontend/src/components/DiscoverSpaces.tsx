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
      <div key={space.id} className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50 hover:border-purple-400/50 transition-colors">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">{space.name}</h3>
            {space.description && (
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{space.description}</p>
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
        
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{space.currentUsers}/{space.maxUsers}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(space.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className={`px-2 py-1 rounded-full text-xs ${
              space.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
            }`}>
              {space.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {isUserInSpace ? (
            <Link
              href={`/space/${space.id}`}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Enter Space
            </Link>
          ) : (
            <button
              onClick={() => handleJoinSpace(space.id)}
              disabled={isJoining === space.id || space.currentUsers >= space.maxUsers}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isJoining === space.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            <span className="text-xs text-red-400">Space Full</span>
          )}
        </div>
      </div>
    );
  };

  if (loadingAllSpaces) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  if (errorAllSpaces) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-red-400">
          <p>Error loading spaces: {errorAllSpaces}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Discover Spaces</h1>
        <p className="text-gray-400">Explore and join public spaces in the metaverse</p>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="search"
          placeholder="Search spaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border-gray-700 bg-[#35354e] py-2.5 pl-10 pr-4 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
        />
      </div>

      {/* Spaces Grid */}
      {filteredSpaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpaces.map(renderSpaceCard)}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center mt-16 md:mt-20">
          <div className="relative mb-4">
            <Image
              src="/images/avatar.png"
              alt="Player Avatar"
              width={96}
              height={96}
              className="object-cover"
            />
            <div className="absolute -top-4 -right-2 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
              ?
            </div>
          </div>
          <p className="text-gray-400">
            {searchQuery ? `No spaces found matching "${searchQuery}"` : 
             "No public spaces available at the moment."}{" "}
            <Link
              href="/dashboard/create"
              className="font-semibold text-green-400 hover:underline"
            >
              Create a Space
            </Link>{" "}
            to get started!
          </p>
        </div>
      )}
    </div>
  );
}
