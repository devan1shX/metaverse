import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Monitor, CheckCircle, Circle } from "lucide-react";

interface OnlineUser {
  id: string;
  user_name: string;
  user_avatar_url?: string;
}

interface ScreenShareSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: OnlineUser[];
  currentUserId: string;
  onStartShare: (targetUserIds: string[]) => void;
}

export function ScreenShareSelectModal({
  isOpen,
  onClose,
  onlineUsers,
  currentUserId,
  onStartShare,
}: ScreenShareSelectModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Filter out ourselves
  const otherUsers = onlineUsers.filter(u => String(u.id) !== String(currentUserId));
  
  // Clear selection when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === otherUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(otherUsers.map(u => u.id)));
    }
  };

  const handleStart = () => {
    if (selectedUserIds.size > 0) {
      onStartShare(Array.from(selectedUserIds));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Share Screen</h3>
                <p className="text-sm text-gray-500">Select users to view your screen</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User List */}
          <div className="p-6 overflow-y-auto flex-1">
            {otherUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No other users in the space</p>
                <p className="text-sm text-gray-400 mt-1">Invite people to share your screen with them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-sm font-semibold text-gray-700">Online Users ({otherUsers.length})</span>
                  <button 
                    onClick={toggleAll}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {selectedUserIds.size === otherUsers.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {otherUsers.map(user => {
                    const isSelected = selectedUserIds.has(user.id);
                    return (
                      <div 
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-50/50' 
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                            {user.user_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 truncate pr-4">{user.user_name}</span>
                        </div>
                        <div className={`flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`}>
                          {isSelected ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={selectedUserIds.size === 0}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2 ${
                selectedUserIds.size > 0 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Start Sharing ({selectedUserIds.size})
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
