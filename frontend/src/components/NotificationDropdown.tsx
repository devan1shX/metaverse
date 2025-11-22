"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Inbox } from "lucide-react";
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

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id);
    }
    
    if (notification.type === 'invites' && notification.data?.spaceId) {
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
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {summary && summary.unread_count > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium px-1">
            {summary.unread_count > 99 ? '99+' : summary.unread_count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {summary && summary.unread_count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <button 
                  onClick={() => refetch()}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      notification.status === 'unread' ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-medium ${
                        notification.status === 'unread' ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {notification.title}
                      </h4>
                      {notification.status === 'unread' && (
                        <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      {notification.status === 'unread' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
