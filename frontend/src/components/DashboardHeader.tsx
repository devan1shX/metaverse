"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  LayoutGrid,
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  Edit3,
  PencilLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { NotificationDropdown } from "./NotificationDropdown";

const navItems = [
  { href: "/discover", label: "Discover" },
  { href: "/dashboard", label: "My Spaces" },
  { href: "/map-editor", label: "Map Editor" },
];

export function DashboardHeader({
  avatarUrl,
  onEditAvatar,
}: {
  avatarUrl?: string;
  onEditAvatar?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout, updateUsername } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

  const AvatarDisplay = ({ size = 9 }: { size?: number }) => {
    const dimensionPx = `${size * 4}px`;
    if (avatarUrl) {
      return (
        <div
          className="relative overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(2,6,12,0.22)]"
          style={{ width: dimensionPx, height: dimensionPx }}
        >
          <Image
            src={avatarUrl}
            alt="User Avatar"
            fill
            style={{ objectFit: "cover" }}
            className="bg-[var(--bg-muted)]"
          />
        </div>
      );
    }
      return (
      <div
        className="flex items-center justify-center rounded-full border border-[rgba(239,188,130,0.24)] bg-[rgba(215,163,102,0.12)] text-sm font-bold text-[var(--accent-strong)] shadow-[0_10px_30px_rgba(215,163,102,0.16)]"
        style={{ width: dimensionPx, height: dimensionPx }}
      >
        {user?.user_name?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
        <div className="container-main">
          <div className="glass-panel flex h-16 items-center justify-between rounded-[28px] px-4 sm:px-5">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="group flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="font-display text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Spaces
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                    Shared world
                  </p>
                </div>
              </Link>

              <nav aria-label="Global" className="hidden md:block">
                <ul className="segmented-control">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="segmented-option"
                        data-active={
                          pathname === item.href ||
                          (item.href === "/dashboard" &&
                            pathname.startsWith("/dashboard"))
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <Link href="/dashboard/create" className="btn-success">
                <Plus className="h-4 w-4" />
                <span>Create Space</span>
              </Link>

              <div className="h-7 w-px bg-white/8" />

              <NotificationDropdown />

              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="glass-panel flex items-center gap-3 rounded-full px-2.5 py-1.5"
                >
                  <AvatarDisplay />
                  <div className="text-left">
                    <p className="max-w-[120px] truncate text-sm font-semibold text-[var(--text-primary)]">
                      {user?.user_name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      Explorer
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--text-soft)] transition-transform ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      <button
                        className="fixed inset-0 z-10 cursor-default"
                        aria-label="Close profile menu"
                        onClick={() => setIsProfileOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="modal-shell absolute right-0 z-20 mt-3 w-64 p-2"
                      >
                        <div className="rounded-[20px] border border-white/6 bg-white/[0.02] px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-soft)]">
                            Signed in as
                          </p>
                          <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                            {user?.user_name}
                          </p>
                          {user?.email && (
                            <p className="truncate text-xs text-[var(--text-muted)]">
                              {user.email}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          <button
                            onClick={openEditUsername}
                            className="btn-ghost flex w-full justify-start rounded-2xl px-4 py-3 text-sm"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit Username
                          </button>

                          {onEditAvatar && (
                            <button
                              onClick={() => {
                                onEditAvatar();
                                setIsProfileOpen(false);
                              }}
                              className="btn-ghost flex w-full justify-start rounded-2xl px-4 py-3 text-sm"
                            >
                              <User className="h-4 w-4" />
                              Edit Avatar
                            </button>
                          )}

                          <button
                            onClick={() => {
                              logout();
                              setIsProfileOpen(false);
                            }}
                            className="btn-danger flex w-full justify-start rounded-2xl px-4 py-3 text-sm"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <NotificationDropdown />
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="floating-control h-11 w-11"
              >
                <span className="sr-only">Toggle Menu</span>
                {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="glass-panel mt-3 rounded-[28px] p-3 md:hidden"
              >
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <AvatarDisplay size={10} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {user?.user_name}
                      </p>
                      {user?.email && (
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <nav className="mt-3 space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="btn-ghost flex w-full justify-start rounded-2xl px-4 py-3 text-sm"
                    >
                      {item.label}
                    </Link>
                  ))}

                  <button
                    onClick={() => {
                      openEditUsername();
                      setIsMenuOpen(false);
                    }}
                    className="btn-ghost flex w-full justify-start rounded-2xl px-4 py-3 text-sm"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit Username
                  </button>

                  <Link
                    href="/dashboard/create"
                    onClick={() => setIsMenuOpen(false)}
                    className="btn-success w-full"
                  >
                    <Plus className="h-4 w-4" />
                    Create Space
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="btn-danger flex w-full justify-start rounded-2xl px-4 py-3 text-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AnimatePresence>
        {isEditUsernameOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              className="overlay-backdrop"
              aria-label="Close username editor"
              onClick={() => setIsEditUsernameOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="modal-shell relative z-10 max-w-md p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="surface-label">Profile</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Edit Username
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditUsernameOpen(false)}
                  className="modal-close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditUsername}>
                <div className="mb-6">
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    New Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="input-field"
                    placeholder="Enter new username"
                    minLength={3}
                    maxLength={32}
                    required
                  />
                  <p className="mt-2 text-xs text-[var(--text-soft)]">
                    3-32 characters. Letters, numbers, hyphens, and underscores only.
                  </p>
                  {editUsernameError && (
                    <p
                      className="mt-3 rounded-2xl border px-3 py-2 text-sm"
                      style={{
                        background: "var(--danger-soft)",
                        borderColor: "rgba(239, 124, 120, 0.2)",
                        color: "var(--danger)",
                      }}
                    >
                      {editUsernameError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditUsernameOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingUsername}
                    className="btn-success"
                  >
                    {isUpdatingUsername ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
