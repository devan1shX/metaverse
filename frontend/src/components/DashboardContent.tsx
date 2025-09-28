"use client";

import { useState, useMemo } from "react";
import { Search, Users, Calendar, MapPin, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSpaces, useUserNotifications } from "@/hooks/useApi";
import { Space, Notification } from "@/lib/api";

export function DashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("last-visited");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user data
  const { data: spacesData, loading: spacesLoading, error: spacesError } = useUserSpaces(user?.id || "");
  const { data: notificationsData, loading: notificationsLoading } = useUserNotifications(user?.id || "", {
    limit: 10,
    status: 'unread'
  });

  // Filter spaces based on tab and search
  const filteredSpaces = useMemo(() => {
    if (!spacesData?.spaces) return [];
    
    let spaces = spacesData.spaces;
    
    // Filter by tab
    if (activeTab === "created-spaces" && user) {
      spaces = spaces.filter(space => space.adminUserId === user.id);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      spaces = spaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return spaces;
  }, [spacesData?.spaces, activeTab, searchQuery, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderSpaceCard = (space: Space) => (
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
        <Link
          href={`/space/${space.id}`}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Enter Space
        </Link>
        {space.adminUserId === user?.id && (
          <button className="text-gray-400 hover:text-white p-2">
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderNotifications = () => {
    if (!notificationsData?.notifications?.length) return null;

    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Notifications</h2>
        <div className="space-y-3">
          {notificationsData.notifications.slice(0, 3).map((notification: Notification) => (
            <div key={notification.id} className="bg-[#35354e] rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">{notification.title}</h4>
                  <p className="text-gray-400 text-sm">{notification.message}</p>
                </div>
                <span className="text-xs text-gray-500">{formatDate(notification.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (spacesLoading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  if (spacesError) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-red-400">
          <p>Error loading dashboard data: {spacesError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Notifications */}
      {renderNotifications()}

      {/* Tabs and Search */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-gray-700/50 self-start">
          <div className="flex items-center -mb-px gap-4">
            <TabButton
              id="last-visited"
              activeTab={activeTab}
              onClick={setActiveTab}
            >
              Last Visited ({spacesData?.total_count || 0})
            </TabButton>
            <TabButton
              id="created-spaces"
              activeTab={activeTab}
              onClick={setActiveTab}
            >
              Created Spaces ({spacesData?.spaces?.filter(s => s.adminUserId === user?.id).length || 0})
            </TabButton>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="search"
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border-gray-700 bg-[#35354e] py-2.5 pl-10 pr-4 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
        </div>
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
             activeTab === "created-spaces" ? "You haven't created any spaces yet." :
             "You haven't visited any spaces."}{" "}
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

const TabButton = ({ id, activeTab, onClick, children }: any) => {
  const isActive = id === activeTab;
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-1 pb-2 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? "border-green-400 text-white"
          : "border-transparent text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
};
