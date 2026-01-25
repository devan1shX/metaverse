"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, LayoutGrid, Menu, X, Bell, User, ChevronDown, LogOut, Edit3 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { NotificationDropdown } from "./NotificationDropdown";

export function DashboardHeader({ avatarUrl, onEditAvatar }: { avatarUrl?: string; onEditAvatar?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  /* Edit Username State */
  const { updateUsername } = useAuth();
  const [isEditUsernameOpen, setIsEditUsernameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [editUsernameError, setEditUsernameError] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const handleEditUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditUsernameError("");
    setIsUpdatingUsername(true);

    const result = await updateUsername(newUsername);
    setIsUpdatingUsername(false);

    if (result.success) {
      setIsEditUsernameOpen(false);
      setIsProfileOpen(false);
    } else {
      setEditUsernameError(result.error || "Failed to update username");
    }
  };

  const openEditUsername = () => {
    setNewUsername(user?.user_name || "");
    setEditUsernameError("");
    setIsEditUsernameOpen(true);
    setIsProfileOpen(false);
  };

  const AvatarDisplay = () => {
    if (avatarUrl) {
      return (
        <div className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-gray-200">
          <Image 
            src={avatarUrl}
            alt="User Avatar"
            fill
            style={{ objectFit: 'cover' }}
            className="bg-gray-100"
          />
        </div>
      );
    }
    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
        {user?.user_name?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left Section: Logo & Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 group"
              >
                <div className="p-1.5 bg-indigo-600 rounded-lg group-hover:bg-indigo-700 transition-colors">
                  <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-900 font-bold text-lg">Spaces</span>
              </Link>

              {/* Desktop Navigation */}
              <nav aria-label="Global" className="hidden md:block">
                <ul className="flex items-center gap-1">
                  <li>
                    <Link
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pathname === '/discover'
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      href="/discover"
                    >
                      Discover
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pathname === '/dashboard'
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      href="/dashboard"
                    >
                      My Spaces
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Right Section: Actions & Profile (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/dashboard/create">
                <button className="flex items-center gap-2 btn-success text-sm">
                  <Plus className="w-4 h-4" />
                  <span>Create Space</span>
                </button>
              </Link>

              <div className="h-6 w-px bg-gray-200"></div>

              <NotificationDropdown />
              
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <AvatarDisplay />
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{user?.user_name}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 z-20">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.user_name}</p>
                        {user?.email && (
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        )}
                      </div>
                      
                      {/* Edit Username Button */}
                       <button
                        onClick={openEditUsername}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Username</span>
                      </button>

                      {onEditAvatar && (
                        <button
                          onClick={() => {
                            onEditAvatar();
                            setIsProfileOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>Edit Avatar</span>
                        </button>
                      )}
                      <div className="border-t border-gray-100 mt-1 mb-1"></div>
                      <button
                        onClick={() => {
                          logout();
                          setIsProfileOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <NotificationDropdown />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="sr-only">Toggle Menu</span>
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <AvatarDisplay />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.user_name}</p>
                  {user?.email && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>
            <nav className="p-2">
              <ul className="space-y-1">
                <li>
                  <Link
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      pathname === '/discover'
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    href="/discover"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Discover
                  </Link>
                </li>
                <li>
                  <Link
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      pathname === '/dashboard'
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Spaces
                  </Link>
                </li>
                 <li className="my-2 border-t border-gray-100"></li>
                 <li>
                   <button
                    onClick={() => {
                      openEditUsername();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Username</span>
                  </button>
                 </li>
                <li className="my-2 border-t border-gray-100"></li>
                <li>
                  <Link href="/dashboard/create" onClick={() => setIsMenuOpen(false)}>
                    <button className="w-full flex items-center justify-center gap-2 btn-success text-sm">
                      <Plus className="w-4 h-4" />
                      <span>Create Space</span>
                    </button>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </header>

      {/* Edit Username Modal */}
      {isEditUsernameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit Username</h3>
                <button 
                  onClick={() => setIsEditUsernameOpen(false)}
                  className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditUsername}>
                <div className="mb-6">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    New Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter new username"
                    minLength={3}
                    maxLength={32}
                    required
                  />
                   <p className="mt-2 text-xs text-gray-500">
                    3-32 characters, letters, numbers, hyphens, and underscores only.
                  </p>
                  {editUsernameError && (
                    <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                      {editUsernameError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditUsernameOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingUsername}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingUsername ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}