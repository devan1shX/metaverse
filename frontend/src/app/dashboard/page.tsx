"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AvatarSelection } from "@/components/AvatarSelection";
import Image from "next/image";

export default function DashboardPage() {
  const { user, loading, updateUserAvatar } = useAuth();
  const router = useRouter();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    user?.user_avatar_url || "/avatars/avatar-2.png"
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (user && user.user_avatar_url) {
      setSelectedAvatar(user.user_avatar_url);
    }
  }, [user, loading, router]);

  const handleSaveAvatar = async (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    const success = await updateUserAvatar(avatarUrl);

    if (success) {
      console.log("Avatar updated successfully!");
    } else {
      console.error("Failed to update avatar.");
      setSelectedAvatar(user?.user_avatar_url || "/avatars/avatar-2.png");
    }
  };

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-[#2a2a3e]">
        <DashboardHeader avatarUrl={selectedAvatar} />
        <main className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-y-hidden">
          {/* Sidebar for Profile */}
          <div className="w-full lg:w-64 bg-[#35354e] border-b lg:border-b-0 lg:border-r border-gray-700/50 p-4 lg:p-6 flex-shrink-0">
            <div className="flex flex-row lg:flex-col items-center lg:text-center gap-4 lg:gap-0">
              <div className="relative w-16 h-16 lg:w-24 lg:h-24 rounded-full mb-0 lg:mb-4 border-2 border-purple-400 flex-shrink-0">
                <Image
                  src={selectedAvatar}
                  alt="User Avatar"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-full bg-[#2a2a3e]"
                />
              </div>
              <div className="flex-grow text-left lg:text-center min-w-0">
                <h2 className="text-lg lg:text-xl font-bold text-white truncate">
                  {user.user_name}
                </h2>
                <p className="text-sm text-gray-400 mb-2 lg:mb-6 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="w-auto lg:w-full rounded-md bg-white/10 px-4 py-2.5 text-sm font-medium text-white shadow transition-colors hover:bg-white/20 flex-shrink-0"
              >
                Edit Character
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow overflow-auto">
            {user?.role === 'admin' ? (
              <div className="p-6">
                <AdminDashboard />
                <div className="mt-8">
                  <DashboardContent />
                </div>
              </div>
            ) : (
              <DashboardContent />
            )}
          </div>
        </main>
      </div>

      <AvatarSelection
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={handleSaveAvatar}
        currentAvatar={selectedAvatar}
      />
    </>
  );
}
