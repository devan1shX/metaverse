"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationManager } from "@/hooks/useApi";
import { Notification } from "@/lib/api";

export function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    summary,
    loading,
    error,
    refetch,
    markAsRead,
    markAllAsRead
  } = useNotificationManager(user?.id || "");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invites':
        return '👥';
      case 'updates':
        return '📢';
      default:
        return '📬';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id);
    }
    
    // Handle notification action based on type
    if (notification.type === 'invites' && notification.data?.spaceId) {
      // Navigate to space or show invite modal
      console.log('Navigate to space:', notification.data.spaceId);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {summary && summary.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {summary.unread_count > 99 ? '99+' : summary.unread_count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#2a2a3e] border border-gray-700 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {summary && summary.unread_count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-400">
                <p>Error loading notifications</p>
                <button 
                  onClick={() => refetch()}
                  className="text-sm text-purple-400 hover:text-purple-300 mt-2"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.status === 'unread' 
                        ? 'bg-purple-500/10 hover:bg-purple-500/20' 
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium ${
                            notification.status === 'unread' ? 'text-white' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          {notification.status === 'unread' && (
                            <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {notification.status === 'unread' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                }}
                className="w-full text-center text-sm text-purple-400 hover:text-purple-300"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
