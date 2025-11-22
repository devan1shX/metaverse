"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AvatarSelection } from "@/components/AvatarSelection";

export default function DashboardPage() {
  const { user, loading, updateUserAvatar } = useAuth();
  const router = useRouter();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    user?.user_avatar_url || "/avatars/avatar-2.png"
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
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
      <div className="flex flex-col min-h-screen bg-gray-50">
        <DashboardHeader 
          avatarUrl={selectedAvatar} 
          onEditAvatar={() => setIsAvatarModalOpen(true)}
        />
        <main className="flex-grow">
          {user?.role === 'admin' ? (
            <div className="container-main py-8">
              <AdminDashboard />
              <div className="mt-8">
                <DashboardContent />
              </div>
            </div>
          ) : (
            <DashboardContent />
          )}
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
