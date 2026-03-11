"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, Loader2, CheckCircle } from "lucide-react";
import { inviteAPI } from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

export function InviteModal({ isOpen, onClose, spaceId, spaceName }: InviteModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearchQuery("");
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, spaceId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inviteAPI.getInvitableUsers(spaceId);
      if (response.data.success) {
        setUsers(response.data.users || []);
        setFilteredUsers(response.data.users || []);
      } else {
        setError(response.data.error || "Failed to load users");
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (toUserId: string, username: string) => {
    setSendingTo(toUserId);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await inviteAPI.sendInvite(toUserId, spaceId);
      if (response.data.success) {
        setSuccessMessage(`Invite sent to ${username}!`);
        setUsers(prev => prev.filter(u => u.id !== toUserId));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data.error || "Failed to send invite");
      }
    } catch (err: any) {
      console.error("Error sending invite:", err);
      
      let specificError = "Failed to send invite";
      const backendError = err.response?.data?.error; 
      if (backendError) {
         if (backendError.includes("pending invite already exists")) {
             specificError = "An invite is already pending for this user.";
         } else {
             specificError = backendError; 
         }
      }
      setError(specificError);
      
    } finally {
      setSendingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="overlay-backdrop" onClick={onClose} aria-label="Close invite modal" />
      <div className="modal-shell relative z-10 flex w-full max-w-md flex-col p-0">
        {/* Header */}
        <div className="modal-header flex items-center justify-between p-5">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Invite People</h2>
            <p className="text-sm text-[var(--text-muted)]">Add members to {spaceName}</p>
          </div>
          <button
            onClick={onClose}
            className="modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-5 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)] w-4 h-4" />
            <input
              type="search"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field rounded-2xl py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div
            className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border p-3"
            style={{
              background: "var(--danger-soft)",
              borderColor: "rgba(239, 124, 120, 0.18)",
              color: "var(--danger)",
            }}
          >
            <X className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {successMessage && (
          <div
            className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border p-3"
            style={{
              background: "var(--success-soft)",
              borderColor: "rgba(122, 194, 142, 0.18)",
              color: "var(--success)",
            }}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition-all hover:border-white/12 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)] text-sm font-bold text-[var(--accent-strong)] shadow-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.username}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendInvite(user.id, user.username)}
                    disabled={sendingTo === user.id}
                    className="btn-secondary ml-3 min-h-0 rounded-full px-3 py-2 text-xs disabled:cursor-not-allowed"
                  >
                    {sendingTo === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Invite
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/8 bg-white/[0.03]">
                <UserPlus className="w-8 h-8 text-[var(--text-soft)]" />
              </div>
              <h3 className="mb-1 font-medium text-[var(--text-primary)]">No users found</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {searchQuery
                  ? `We couldn't find anyone matching "${searchQuery}"`
                  : "There are no users available to invite right now."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
