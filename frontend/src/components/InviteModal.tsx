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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invite People</h2>
            <p className="text-sm text-gray-500">Add members to {spaceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-5 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="search"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
            <X className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-green-600 text-sm">{successMessage}</p>
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
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm truncate">{user.username}</p>
                      <p className="text-gray-500 text-xs truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendInvite(user.id, user.username)}
                    disabled={sendingTo === user.id}
                    className="ml-3 flex items-center gap-1.5 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">No users found</h3>
              <p className="text-gray-500 text-sm">
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
