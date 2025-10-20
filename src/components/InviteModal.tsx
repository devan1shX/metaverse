"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, Loader2 } from "lucide-react";
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
        // Remove the user from the list
        setUsers(prev => prev.filter(u => u.id !== toUserId));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data.error || "Failed to send invite");
      }
    } catch (err: any) {
      console.error("Error sending invite:", err);
      setError(err.response?.data?.error || "Failed to send invite");
    } finally {
      setSendingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#2a2a3e] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold text-white">Invite Users</h2>
            <p className="text-sm text-gray-400 mt-1">to {spaceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="search"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border-gray-700 bg-[#35354e] py-2.5 pl-10 pr-4 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/50 rounded-md">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-[#35354e] rounded-lg border border-gray-700/50 hover:border-purple-400/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{user.username}</p>
                      <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    </div>
                    {user.role === 'admin' && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full flex-shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleSendInvite(user.id, user.username)}
                    disabled={sendingTo === user.id}
                    className="ml-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0"
                  >
                    {sendingTo === user.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Invite
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <UserPlus className="w-12 h-12 text-gray-500 mb-3" />
              <p className="text-gray-400">
                {searchQuery
                  ? `No users found matching "${searchQuery}"`
                  : "No users available to invite"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

