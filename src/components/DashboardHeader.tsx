"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, LayoutGrid, Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { NotificationDropdown } from "./NotificationDropdown";

export function DashboardHeader({ avatarUrl }: { avatarUrl?: string }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const AvatarDisplay = () => {
    if (avatarUrl) {
      return (
        <div className="relative h-8 w-8 rounded-full overflow-hidden">
          <Image 
            src={avatarUrl}
            alt="User Avatar"
            fill
            style={{ objectFit: 'contain' }}
            className="bg-[#2a2a3e]"
          />
        </div>
      );
    }
    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white">
        {user?.user_name?.charAt(0).toUpperCase()}
      </div>
    );
  };


  return (
    <header className="bg-[#35354e] border-b border-gray-700/50 relative z-10">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section: Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white font-bold text-xl"
            >
              <LayoutGrid className="w-6 h-6 text-purple-400" />
              <span>Spaces</span>
            </Link>

            {/* Desktop Navigation (hidden on mobile) */}
            <nav aria-label="Global" className="hidden md:block">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <Link
                    className="text-gray-300 transition hover:text-white"
                    href="/discover"
                  >
                    Discover
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-white font-semibold rounded-md bg-white/10 px-3 py-1.5"
                    href="/dashboard"
                  >
                    My Spaces
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Right Section: User Info & Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <NotificationDropdown />
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <AvatarDisplay />
              <span>{user?.user_name}</span>
            </div>
            <Link href="/dashboard/create">
              <button className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2.5 text-sm font-medium text-white shadow transition-colors hover:bg-green-600">
                <Plus className="w-4 h-4" />
                <span>Create Space</span>
              </button>
            </Link>
            <button
              onClick={logout}
              className="text-gray-300 hover:text-white text-sm"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button & User Info */}
          <div className="md:hidden flex items-center gap-4">
            <div className="sm:hidden">
              <AvatarDisplay />
            </div>
            <span className="text-sm text-gray-300 hidden sm:block">
              {user?.user_name}
            </span>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded p-1.5 text-gray-300 transition hover:text-white"
            >
              <span className="sr-only">Toggle Menu</span>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#35354e] border-b border-gray-700/50">
          <nav aria-label="Mobile Global" className="flow-root">
            <ul className="flex flex-col gap-1 p-4">
              <li>
                <Link
                  className="block rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                  href="/discover"
                >
                  Discover
                </Link>
              </li>
              <li>
                <Link
                  className="block rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                  href="/dashboard"
                >
                  My Spaces
                </Link>
              </li>
              <li className="h-px w-full bg-gray-700/50 my-2"></li>
              <li>
                <Link href="/dashboard/create">
                  <button className="w-full flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2.5 text-sm font-medium text-white shadow transition-colors hover:bg-green-600">
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
                  className="w-full block rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 text-center"
                >
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}