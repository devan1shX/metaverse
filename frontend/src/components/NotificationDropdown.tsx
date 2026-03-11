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
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-[var(--text-muted)] transition-colors hover:border-white/14 hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
      >
        <Bell className="w-6 h-6" />
        {summary && summary.unread_count > 0 && (
          <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-xs font-medium text-[#230f0d]" style={{ background: "var(--danger)" }}>
            {summary.unread_count > 99 ? '99+' : summary.unread_count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="modal-shell absolute right-0 z-50 mt-3 w-80">
          {/* Header */}
          <div className="modal-header flex items-center justify-between p-4">
            <h3 className="font-display text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Notifications</h3>
            <div className="flex items-center gap-2">
              {summary && summary.unread_count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-[var(--accent-strong)] hover:text-[var(--text-primary)]"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="modal-close h-8 w-8"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]"></div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="mb-2 text-sm" style={{ color: "var(--danger)" }}>{error}</p>
                <button 
                  onClick={() => refetch()}
                  className="text-sm text-[var(--accent-strong)] hover:text-[var(--text-primary)]"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="mx-auto mb-3 h-12 w-12 text-[var(--text-soft)]" />
                <p className="text-sm text-[var(--text-muted)]">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`cursor-pointer p-4 transition-colors hover:bg-white/[0.04] ${
                      notification.status === 'unread' ? 'bg-[rgba(215,163,102,0.08)]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-medium ${
                        notification.status === 'unread' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                      }`}>
                        {notification.title}
                      </h4>
                      {notification.status === 'unread' && (
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]"></div>
                      )}
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm text-[var(--text-muted)]">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-soft)]">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      {notification.status === 'unread' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-[var(--accent-strong)] hover:text-[var(--text-primary)]"
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
